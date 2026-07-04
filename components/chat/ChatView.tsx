"use client";

import { useEffect, useRef, useState } from "react";
import { HandWaving } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { uploadChatPhoto } from "@/lib/supabase/uploadChatPhoto";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ChatMessage, Reaction } from "@/lib/types";

const DEFAULT_REACTION = "❤️";

type PendingChatMessage = ChatMessage & { pending?: boolean };

export function ChatView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PendingChatMessage[]>([]);
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, Reaction[]>>({});
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [actionSheetMessageId, setActionSheetMessageId] = useState<string | null>(null);

  const profilesRef = useRef<Record<string, { display_name: string; avatar_color: string | null }>>({});
  const userIdRef = useRef<string | null>(null);
  const groupIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_color");
      for (const p of profiles ?? []) {
        profilesRef.current[p.id] = { display_name: p.display_name, avatar_color: p.avatar_color };
      }

      const { data: initialMessages } = await supabase
        .from("chat_messages")
        .select("*, profiles(display_name, avatar_color)")
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages(initialMessages ?? []);

      const messageIds = (initialMessages ?? []).map((m) => m.id);
      if (messageIds.length > 0) {
        const { data: reactions } = await supabase
          .from("message_reactions")
          .select("*")
          .in("message_id", messageIds);

        const grouped: Record<string, Reaction[]> = {};
        for (const r of reactions ?? []) {
          grouped[r.message_id] = [...(grouped[r.message_id] ?? []), r];
        }
        setReactionsByMessage(grouped);
      }

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend({ body, imageFile }: { body: string; imageFile: File | null }) {
    if (!userId || !groupIdRef.current) return;
    const supabase = createClient();
    const tempId = crypto.randomUUID();
    const replyToId = replyingTo?.id ?? null;

    const optimisticMessage: PendingChatMessage = {
      id: tempId,
      body,
      created_by: userId,
      group_id: groupIdRef.current,
      image_url: null,
      reply_to_id: replyToId,
      edited_at: null,
      created_at: new Date().toISOString(),
      profiles: {
        display_name: profilesRef.current[userId]?.display_name ?? "You",
        avatar_color: profilesRef.current[userId]?.avatar_color ?? null,
      },
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyingTo(null);

    let imageUrl: string | null = null;
    if (imageFile) {
      try {
        imageUrl = await uploadChatPhoto(supabase, groupIdRef.current, imageFile);
      } catch {
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
        image_url: imageUrl,
        reply_to_id: replyToId,
      })
      .select()
      .single();

    if (error || !data) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId
          ? {
              ...optimisticMessage,
              id: data.id,
              image_url: data.image_url,
              created_at: data.created_at,
              pending: false,
            }
          : m
      )
    );
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

  if (loading || !userId) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-12 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
        <Skeleton className="h-12 w-1/2 rounded-2xl" />
      </div>
    );
  }

  const messagesById = new Map(messages.map((m) => [m.id, m]));
  const actionSheetMessage = actionSheetMessageId ? messagesById.get(actionSheetMessageId) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 pb-0">
        <h1 className="text-xl font-semibold text-primary">Chat</h1>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <EmptyState
            icon={HandWaving}
            title="Say hello!"
            subtitle="This is the start of your group chat. Send the first message."
          />
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.created_by === userId}
            pending={message.pending}
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
      <MessageComposer onSend={handleSend} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} />

      <MessageActionSheet
        open={actionSheetMessageId !== null}
        onClose={() => setActionSheetMessageId(null)}
        canEdit={actionSheetMessage?.created_by === userId}
        onReply={() => {
          if (actionSheetMessage) setReplyingTo(actionSheetMessage);
        }}
        onEdit={() => {
          if (actionSheetMessage) setEditingMessageId(actionSheetMessage.id);
        }}
        onReact={(emoji) => {
          if (actionSheetMessageId) handleToggleReaction(actionSheetMessageId, emoji);
        }}
      />
    </div>
  );
}
