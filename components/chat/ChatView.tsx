"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, HandWaving } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { uploadChatPhoto } from "@/lib/supabase/uploadChatPhoto";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { useUnreadIndicator } from "@/components/UnreadIndicatorContext";
import { trackEvent } from "@/lib/analytics";
import type { ChatMessage, Reaction } from "@/lib/types";

const NEAR_BOTTOM_THRESHOLD_PX = 120;
const GROUP_GAP_MS = 5 * 60 * 1000;

// Consecutive messages from the same sender, sent close together, are
// visually grouped under a single avatar/name/time header instead of
// repeating it on every bubble - a reply always starts a fresh group since
// its quoted preview needs its own clearly-attributed context.
function isGroupStart(message: ChatMessage, previous: ChatMessage | undefined): boolean {
  if (!previous) return true;
  if (message.reply_to_id) return true;
  if (message.created_by !== previous.created_by) return true;
  return new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() > GROUP_GAP_MS;
}

const DEFAULT_REACTION = "❤️";

type PendingChatMessage = ChatMessage & { pending?: boolean; uploadingImages?: boolean };

export function ChatView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PendingChatMessage[]>([]);
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, Reaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [actionSheetMessageId, setActionSheetMessageId] = useState<string | null>(null);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<ChatMessage | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const profilesRef = useRef<
    Record<string, { display_name: string; avatar_color: string | null; avatar_url: string | null }>
  >({});
  const userIdRef = useRef<string | null>(null);
  const groupIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const isNearBottomRef = useRef(true);
  const { markChatSeen } = useUnreadIndicator();

  useEffect(() => {
    const supabase = createClient();
    let messagesChannel: ReturnType<typeof supabase.channel> | null = null;
    let reactionsChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function init() {
      // Wait for the session to be confirmed before subscribing to Realtime -
      // joining a channel before the client's auth token has propagated makes
      // Realtime evaluate RLS as the anon role, which silently receives no
      // rows for these group-scoped policies.
      const membership = await getCurrentMembership(supabase);
      if (!membership || cancelled) return;
      setUserId(membership.userId);
      userIdRef.current = membership.userId;
      groupIdRef.current = membership.groupId;

      // Profiles and messages are independent of each other - fetch together
      // instead of one after the other. Reactions are embedded directly in
      // the messages query (message_reactions has a FK to chat_messages),
      // which skips what used to be a third sequential round trip.
      // Descending + limit gets the most recent 100 rows - ascending would
      // instead grab the oldest 100 ever sent, which would strand every
      // group past its first 100 messages on permanently stale history from
      // here on, since a fresh load would never reach anything recent.
      const [{ data: profiles }, { data: initialMessages }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_color, avatar_url")
          .eq("group_id", membership.groupId),
        supabase
          .from("chat_messages")
          .select("*, profiles(display_name, avatar_color, avatar_url), message_reactions(*)")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      for (const p of profiles ?? []) {
        profilesRef.current[p.id] = {
          display_name: p.display_name,
          avatar_color: p.avatar_color,
          avatar_url: p.avatar_url,
        };
      }

      const grouped: Record<string, Reaction[]> = {};
      const cleanMessages: PendingChatMessage[] = [];
      for (const row of (initialMessages ?? []).reverse()) {
        const { message_reactions, ...message } = row as ChatMessage & { message_reactions: Reaction[] };
        if (message_reactions?.length) grouped[message.id] = message_reactions;
        cleanMessages.push(message);
      }

      setMessages(cleanMessages);
      setReactionsByMessage(grouped);
      setLoading(false);

      if (cancelled) return;

      // Only other members' messages come through realtime; the sender's own
      // message is added optimistically and finalized via the insert response,
      // which avoids a race between the realtime echo and that response.
      messagesChannel = supabase
        .channel("chat_messages_changes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload) => {
            const row = payload.new as ChatMessage;
            if (row.created_by === userIdRef.current) return;
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [
                ...prev,
                {
                  ...row,
                  profiles: {
                    display_name: profilesRef.current[row.created_by]?.display_name ?? "Someone",
                    avatar_color: profilesRef.current[row.created_by]?.avatar_color ?? null,
                    avatar_url: profilesRef.current[row.created_by]?.avatar_url ?? null,
                  },
                },
              ];
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_messages" },
          (payload) => {
            const row = payload.new as ChatMessage;
            setMessages((prev) =>
              prev.map((m) => (m.id === row.id ? { ...m, body: row.body, edited_at: row.edited_at } : m))
            );
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "chat_messages" },
          (payload) => {
            const row = payload.old as ChatMessage;
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
            setReactionsByMessage((prev) => {
              if (!(row.id in prev)) return prev;
              const rest = { ...prev };
              delete rest[row.id];
              return rest;
            });
          }
        )
        .subscribe();

      reactionsChannel = supabase
        .channel("message_reactions_changes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "message_reactions" },
          (payload) => {
            const row = payload.new as Reaction;
            setReactionsByMessage((prev) => {
              const existing = prev[row.message_id] ?? [];
              if (existing.some((r) => r.id === row.id)) return prev;
              return { ...prev, [row.message_id]: [...existing, row] };
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "message_reactions" },
          (payload) => {
            const row = payload.old as Reaction;
            setReactionsByMessage((prev) => ({
              ...prev,
              [row.message_id]: (prev[row.message_id] ?? []).filter((r) => r.id !== row.id),
            }));
          }
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (messagesChannel) supabase.removeChannel(messagesChannel);
      if (reactionsChannel) supabase.removeChannel(reactionsChannel);
    };
  }, []);

  // Guards against the scroll listener seeing the in-flight frames of our
  // own smooth-scroll-to-bottom as "the user scrolled away" and flashing the
  // jump-to-latest button back on before the animation settles.
  const suppressScrollDetectionRef = useRef(false);
  // The very first time messages populate (opening Chat), jumping instantly
  // is correct - animating a smooth scroll from the top would visibly play
  // through the entire loaded history first, getting worse the longer a
  // group's been chatting. Only scroll *changes* after that (a new message
  // arriving) should animate.
  const hasScrolledInitialLoadRef = useRef(false);

  function scrollToBottomSmooth() {
    const container = containerRef.current;
    suppressScrollDetectionRef.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

    function settle() {
      suppressScrollDetectionRef.current = false;
      isNearBottomRef.current = true;
      setShowJumpToLatest(false);
      container?.removeEventListener("scrollend", settle);
    }

    // "scrollend" fires once the browser's smooth-scroll animation has
    // actually finished - a fixed timeout can't track that reliably since
    // duration scales with how far there was to scroll. Fall back to a
    // timeout only where scrollend isn't supported.
    if (container && "onscrollend" in window) {
      container.addEventListener("scrollend", settle, { once: true });
    } else {
      window.setTimeout(settle, 700);
    }
  }

  // Only auto-scroll when the user is already near the bottom - otherwise a
  // message arriving while they're reading back through history would yank
  // them away from what they're looking at.
  useEffect(() => {
    if (messages.length === 0 || !isNearBottomRef.current) return;

    if (!hasScrolledInitialLoadRef.current) {
      hasScrolledInitialLoadRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      return;
    }

    scrollToBottomSmooth();
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container || suppressScrollDetectionRef.current) return;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const nearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
      isNearBottomRef.current = nearBottom;
      setShowJumpToLatest(!nearBottom);
    }

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
    // Re-attach once the real scrollable container mounts (it doesn't exist
    // yet while the loading skeleton is showing).
  }, [loading]);

  function scrollToLatest() {
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
    scrollToBottomSmooth();
  }

  // Re-mark as seen whenever the message list changes while this view is
  // mounted, so a message arriving while you're actively looking at chat
  // doesn't leave the nav badge lit.
  useEffect(() => {
    if (messages.length > 0) markChatSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function handleSend({ body, imageFiles }: { body: string; imageFiles: File[] }) {
    if (!userId || !groupIdRef.current) return;
    const supabase = createClient();
    const tempId = crypto.randomUUID();
    const replyToId = replyingTo?.id ?? null;

    // Local object URLs give an instant preview of the exact photos being
    // sent (rather than a blank bubble) while the real upload is still in
    // flight - uploadingImages drives a spinner overlay on top of them.
    const previewUrls = imageFiles.map((file) => URL.createObjectURL(file));

    const optimisticMessage: PendingChatMessage = {
      id: tempId,
      body,
      created_by: userId,
      group_id: groupIdRef.current,
      image_urls: previewUrls,
      reply_to_id: replyToId,
      edited_at: null,
      created_at: new Date().toISOString(),
      profiles: {
        display_name: profilesRef.current[userId]?.display_name ?? "You",
        avatar_color: profilesRef.current[userId]?.avatar_color ?? null,
        avatar_url: profilesRef.current[userId]?.avatar_url ?? null,
      },
      pending: true,
      uploadingImages: imageFiles.length > 0,
    };
    // Sending is an explicit action - always jump to the new message even if
    // the user had scrolled up to read history.
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyingTo(null);

    let imageUrls: string[] = [];
    if (imageFiles.length > 0) {
      try {
        imageUrls = await Promise.all(
          imageFiles.map((file) => uploadChatPhoto(supabase, groupIdRef.current!, file))
        );
      } catch {
        // The bubble is being removed entirely here, so the preview blobs it
        // was showing are no longer needed - safe to release right away.
        previewUrls.forEach((url) => URL.revokeObjectURL(url));
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        body,
        created_by: userId,
        group_id: groupIdRef.current,
        image_urls: imageUrls,
        reply_to_id: replyToId,
      })
      .select()
      .single();

    if (error || !data) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    trackEvent('chat_message_sent')

    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId
          ? {
              ...optimisticMessage,
              id: data.id,
              image_urls: data.image_urls,
              created_at: data.created_at,
              pending: false,
              uploadingImages: false,
            }
          : m
      )
    );
    // Now that the bubble has switched over to the real hosted URLs, the
    // local preview blobs are safe to release.
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  async function handleToggleReaction(messageId: string, emoji: string) {
    if (!userId) return;
    const supabase = createClient();
    const existing = (reactionsByMessage[messageId] ?? []).find(
      (r) => r.user_id === userId && r.emoji === emoji
    );

    if (existing) {
      setReactionsByMessage((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] ?? []).filter((r) => r.id !== existing.id),
      }));
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      const tempReaction: Reaction = {
        id: crypto.randomUUID(),
        message_id: messageId,
        user_id: userId,
        emoji,
        created_at: new Date().toISOString(),
      };
      setReactionsByMessage((prev) => ({
        ...prev,
        [messageId]: [...(prev[messageId] ?? []), tempReaction],
      }));
      const { data } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: userId, emoji })
        .select()
        .single();
      if (data) {
        setReactionsByMessage((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] ?? []).map((r) => (r.id === tempReaction.id ? data : r)),
        }));
      }
    }
  }

  async function handleSaveEdit(messageId: string, newBody: string) {
    const supabase = createClient();
    const editedAt = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, body: newBody, edited_at: editedAt } : m))
    );
    setEditingMessageId(null);
    await supabase.from("chat_messages").update({ body: newBody, edited_at: editedAt }).eq("id", messageId);
  }

  async function handleDeleteMessage(messageId: string) {
    const supabase = createClient();
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setReactionsByMessage((prev) => {
      if (!(messageId in prev)) return prev;
      const rest = { ...prev };
      delete rest[messageId];
      return rest;
    });
    await supabase.from("chat_messages").delete().eq("id", messageId);
  }

  if (loading || !userId) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
          </div>
          <div className="flex flex-row-reverse gap-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-10 w-1/2 rounded-2xl" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-16 w-2/3 rounded-2xl" />
          </div>
          <div className="flex flex-row-reverse gap-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-12 w-1/3 rounded-2xl" />
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-white p-3">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        </div>
      </div>
    );
  }

  const messagesById = new Map(messages.map((m) => [m.id, m]));
  const actionSheetMessage = actionSheetMessageId ? messagesById.get(actionSheetMessageId) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          data-chat-scroll-container
          className="h-full overflow-y-auto p-4"
        >
          {messages.length === 0 && (
            <EmptyState
              icon={HandWaving}
              title="Say hello!"
              subtitle="This is the start of your group chat. Send the first message."
              onClick={() => composerInputRef.current?.focus()}
            />
          )}
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.created_by === userId}
              pending={message.pending}
              uploadingImages={message.uploadingImages}
              groupStart={isGroupStart(message, messages[index - 1])}
              reactions={reactionsByMessage[message.id] ?? []}
              currentUserId={userId}
              replyToMessage={message.reply_to_id ? messagesById.get(message.reply_to_id) : null}
              isEditing={editingMessageId === message.id}
              onDoubleTapReact={() => handleToggleReaction(message.id, DEFAULT_REACTION)}
              onOpenActions={() => setActionSheetMessageId(message.id)}
              onToggleReaction={(emoji) => handleToggleReaction(message.id, emoji)}
              onSaveEdit={(body) => handleSaveEdit(message.id, body)}
              onCancelEdit={() => setEditingMessageId(null)}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        <AnimatePresence>
          {showJumpToLatest && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 10, x: "-50%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={scrollToLatest}
              className="absolute bottom-3 left-1/2 flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-primary/30"
            >
              <ArrowDown size={16} weight="bold" /> Jump to latest
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <MessageComposer
        ref={composerInputRef}
        onSend={handleSend}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      <MessageActionSheet
        open={actionSheetMessageId !== null}
        onClose={() => setActionSheetMessageId(null)}
        canEdit={actionSheetMessage?.created_by === userId}
        messageBody={actionSheetMessage?.body ?? ""}
        onReply={() => {
          if (actionSheetMessage) setReplyingTo(actionSheetMessage);
        }}
        onEdit={() => {
          if (actionSheetMessage) setEditingMessageId(actionSheetMessage.id);
        }}
        onDelete={() => {
          if (actionSheetMessage) setDeleteConfirmMessage(actionSheetMessage);
        }}
        onReact={(emoji) => {
          if (actionSheetMessageId) handleToggleReaction(actionSheetMessageId, emoji);
        }}
      />

      <ConfirmSheet
        open={deleteConfirmMessage !== null}
        title="Delete this message?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteConfirmMessage) handleDeleteMessage(deleteConfirmMessage.id);
          setDeleteConfirmMessage(null);
        }}
        onCancel={() => setDeleteConfirmMessage(null)}
      />
    </div>
  );
}
