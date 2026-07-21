"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, CircleNotch, HandWaving } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { uploadChatPhoto } from "@/lib/supabase/uploadChatPhoto";
import { resolveChatPhotoUrls } from "@/lib/supabase/resolveChatPhotoUrls";
import { extractChatPhotoPath } from "@/lib/supabase/chatPhotoPath";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { MessageActionSheet } from "@/components/chat/MessageActionSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { chatSeenKey, useUnreadIndicator } from "@/components/UnreadIndicatorContext";
import { trackEvent } from "@/lib/analytics";
import { cn, formatDate } from "@/lib/utils";
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

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "Today"/"Yesterday" read naturally for the last couple of days - anything
// older falls back to the same weekday/month/day format used elsewhere in
// the app (formatDate), rather than reinventing a second date style just
// for chat.
function chatDayLabel(date: Date): string {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (isSameLocalDay(date, now)) return "Today";
  if (isSameLocalDay(date, yesterday)) return "Yesterday";
  return formatDate(date);
}

const DEFAULT_REACTION = "❤️";

type RetryPayload = {
  body: string;
  imageFiles: File[];
  previewUrls: string[];
  replyToId: string | null;
};

type PendingChatMessage = ChatMessage & {
  pending?: boolean;
  uploadingImages?: boolean;
  failed?: boolean;
  retryPayload?: RetryPayload;
};

export function ChatView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PendingChatMessage[]>([]);
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, Reaction[]>>({});
  const [resolvedImageUrls, setResolvedImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [actionSheetMessageId, setActionSheetMessageId] = useState<string | null>(null);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<ChatMessage | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [memberNames, setMemberNames] = useState<string[]>([]);

  const profilesRef = useRef<
    Record<string, { display_name: string; avatar_color: string | null; avatar_url: string | null }>
  >({});
  const userIdRef = useRef<string | null>(null);
  const groupIdRef = useRef<string | null>(null);
  // handleScroll's listener is attached once (see the effect keyed on
  // [loading]) and never re-attached on every message, so anything it reads
  // has to come from a ref kept in sync via effects below - closing over
  // the state directly would freeze loadMoreMessages's view of these at
  // whatever they were on that one render.
  const messagesRef = useRef<PendingChatMessage[]>([]);
  const hasMoreHistoryRef = useRef(true);
  const loadingMoreHistoryRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);
  // Captures the container's scrollHeight right before older messages are
  // prepended, so a layout effect can shift scrollTop by the same delta
  // once they're in the DOM - otherwise the browser keeps scrollTop fixed
  // and the whole view visually jumps down by however tall the new content is.
  const prependAdjustRef = useRef<{ prevScrollHeight: number } | null>(null);
  // Captured once at mount, before markChatSeen() (fired from a later effect)
  // overwrites it - this is what "unread" is measured against for the
  // initial scroll target, so it has to reflect the value as of walking in.
  const lastSeenAtMountRef = useRef<string | null>(null);
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
      lastSeenAtMountRef.current = localStorage.getItem(chatSeenKey(membership.groupId));
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
      setMemberNames((profiles ?? []).map((p) => p.display_name));

      const grouped: Record<string, Reaction[]> = {};
      const cleanMessages: PendingChatMessage[] = [];
      for (const row of (initialMessages ?? []).reverse()) {
        const { message_reactions, ...message } = row as ChatMessage & { message_reactions: Reaction[] };
        if (message_reactions?.length) grouped[message.id] = message_reactions;
        cleanMessages.push(message);
      }

      setMessages(cleanMessages);
      messagesRef.current = cleanMessages;
      setReactionsByMessage(grouped);
      hasMoreHistoryRef.current = (initialMessages ?? []).length === 100;
      setHasMoreHistory(hasMoreHistoryRef.current);
      setLoading(false);

      const allImageRefs = cleanMessages.flatMap((m) => m.image_urls);
      if (allImageRefs.length > 0) {
        resolveChatPhotoUrls(supabase, allImageRefs).then((resolved) => {
          if (!cancelled) setResolvedImageUrls((prev) => ({ ...prev, ...resolved }));
        });
      }

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
            const senderName = profilesRef.current[row.created_by]?.display_name ?? "Someone";
            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              return [
                ...prev,
                {
                  ...row,
                  profiles: {
                    display_name: senderName,
                    avatar_color: profilesRef.current[row.created_by]?.avatar_color ?? null,
                    avatar_url: profilesRef.current[row.created_by]?.avatar_url ?? null,
                  },
                },
              ];
            });
            // Announced for screen readers - new bubbles otherwise append to
            // the DOM with no signal that anything changed.
            const preview = row.body || (row.image_urls.length > 0 ? "sent a photo" : row.shared_title ? `shared ${row.shared_title}` : "sent a message");
            setLiveAnnouncement(`New message from ${senderName}: ${preview}`);
            if (row.image_urls.length > 0) {
              resolveChatPhotoUrls(supabase, row.image_urls).then((resolved) => {
                setResolvedImageUrls((prev) => ({ ...prev, ...resolved }));
              });
            }
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

    // Realtime subscriptions only deliver events while the socket is
    // actually connected - backgrounding the tab (the classic trigger on
    // mobile) drops it, and anything that happened while disconnected is
    // gone for good once it reconnects unless something re-fetches. Re-pulls
    // the same latest-100 window used at initial load and reconciles it
    // against local state on reconnect/refocus.
    async function resyncMessages() {
      if (!groupIdRef.current || cancelled) return;
      const { data } = await supabase
        .from("chat_messages")
        .select("*, profiles(display_name, avatar_color, avatar_url), message_reactions(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!data || data.length === 0 || cancelled) return;

      const grouped: Record<string, Reaction[]> = {};
      const fresh: PendingChatMessage[] = [];
      for (const row of [...data].reverse()) {
        const { message_reactions, ...message } = row as ChatMessage & { message_reactions: Reaction[] };
        if (message_reactions?.length) grouped[message.id] = message_reactions;
        fresh.push(message);
      }

      const windowStart = new Date(fresh[0].created_at).getTime();
      const freshById = new Map(fresh.map((m) => [m.id, m]));

      setMessages((prev) => {
        const kept = prev.filter((m) => {
          // Never clobber an in-flight optimistic send, or a failed one still
          // waiting on the user to retry/discard it - a resync racing with a
          // failed send is a realistic combination (both can be triggered by
          // the same flaky-connection episode), and the whole point of the
          // failed-send UI is that it doesn't just vanish.
          if (m.pending || m.failed) return true;
          const withinWindow = new Date(m.created_at).getTime() >= windowStart;
          // Drop anything inside the refetched window that's missing from
          // the fresh result (deleted while disconnected); leave older,
          // paginated-in history untouched.
          return !withinWindow || freshById.has(m.id);
        });
        const merged = kept.map((m) => (!m.pending && freshById.has(m.id) ? { ...freshById.get(m.id)!, pending: false } : m));
        const existingIds = new Set(merged.map((m) => m.id));
        const added = fresh.filter((m) => !existingIds.has(m.id));
        return [...merged, ...added].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      setReactionsByMessage((prev) => ({ ...prev, ...grouped }));

      const newImageRefs = fresh.flatMap((m) => m.image_urls);
      if (newImageRefs.length > 0) {
        resolveChatPhotoUrls(supabase, newImageRefs).then((resolved) => {
          if (!cancelled) setResolvedImageUrls((prev) => ({ ...prev, ...resolved }));
        });
      }
    }

    function handleVisible() {
      if (document.visibilityState === "visible") resyncMessages();
    }
    function handleOnline() {
      resyncMessages();
    }

    init();
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      if (messagesChannel) supabase.removeChannel(messagesChannel);
      if (reactionsChannel) supabase.removeChannel(reactionsChannel);
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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
  // A photo's aspect ratio is only a guess (square) until it actually loads,
  // so the initial scroll can land short of its real target once a late
  // image correction grows the content underneath it - re-snapping via
  // ResizeObserver below, for a brief window after the initial scroll,
  // keeps that from stranding the view above where it meant to land.
  const initialScrollTargetRef = useRef<{ el: HTMLElement; block: ScrollLogicalPosition } | null>(null);
  const settlingRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    resizeObserverRef.current = new ResizeObserver(() => {
      if (settlingRef.current && initialScrollTargetRef.current) {
        const { el, block } = initialScrollTargetRef.current;
        el.scrollIntoView({ behavior: "auto", block });
      }
    });
    return () => resizeObserverRef.current?.disconnect();
  }, []);

  function observeMessageEl(el: HTMLDivElement | null) {
    if (el) resizeObserverRef.current?.observe(el);
  }

  function scrollToBottomSmooth() {
    const container = containerRef.current;
    suppressScrollDetectionRef.current = true;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

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

      // Land on the oldest message from someone else sent since this device
      // last looked at Chat, so there's something to read up from - not
      // just "unread exists" but the actual start of it. No stored
      // last-seen value, or nothing unread, falls through to the bottom.
      const lastSeen = lastSeenAtMountRef.current;
      const firstUnread = lastSeen
        ? messages.find(
            (m) => m.created_by !== userIdRef.current && new Date(m.created_at).getTime() > new Date(lastSeen).getTime()
          )
        : undefined;
      setFirstUnreadId(firstUnread?.id ?? null);
      const targetEl = firstUnread
        ? containerRef.current?.querySelector<HTMLElement>(`[data-message-id="${firstUnread.id}"]`)
        : null;

      if (targetEl) {
        initialScrollTargetRef.current = { el: targetEl, block: "start" };
        targetEl.scrollIntoView({ behavior: "auto", block: "start" });
      } else if (bottomRef.current) {
        initialScrollTargetRef.current = { el: bottomRef.current, block: "end" };
        bottomRef.current.scrollIntoView({ behavior: "auto", block: "end" });
      }

      settlingRef.current = true;
      window.setTimeout(() => {
        settlingRef.current = false;
      }, 1500);
      return;
    }

    scrollToBottomSmooth();
  }, [messages]);

  // Once the DOM reflects a batch of older messages prepended to the top,
  // scrollTop needs to move by exactly however much taller the content just
  // got - otherwise the browser holds scrollTop fixed and the view jumps
  // down to what looks like a random spot mid-conversation.
  useLayoutEffect(() => {
    const adjustment = prependAdjustRef.current;
    const container = containerRef.current;
    if (adjustment && container) {
      container.scrollTop += container.scrollHeight - adjustment.prevScrollHeight;
      prependAdjustRef.current = null;
    }
  }, [messages]);

  async function loadMoreMessages() {
    if (!hasMoreHistoryRef.current || loadingMoreHistoryRef.current || messagesRef.current.length === 0) return;
    const oldest = messagesRef.current[0];
    loadingMoreHistoryRef.current = true;
    setLoadingMoreHistory(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profiles(display_name, avatar_color, avatar_url), message_reactions(*)")
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(100);

    const older: PendingChatMessage[] = [];
    const grouped: Record<string, Reaction[]> = {};
    for (const row of (data ?? []).reverse()) {
      const { message_reactions, ...message } = row as ChatMessage & { message_reactions: Reaction[] };
      if (message_reactions?.length) grouped[message.id] = message_reactions;
      older.push(message);
    }

    hasMoreHistoryRef.current = older.length === 100;
    setHasMoreHistory(older.length === 100);
    if (older.length > 0) {
      const container = containerRef.current;
      if (container) prependAdjustRef.current = { prevScrollHeight: container.scrollHeight };
      setMessages((prev) => [...older, ...prev]);
      setReactionsByMessage((prev) => ({ ...grouped, ...prev }));
      const olderImageRefs = older.flatMap((m) => m.image_urls);
      if (olderImageRefs.length > 0) {
        resolveChatPhotoUrls(supabase, olderImageRefs).then((resolved) => {
          setResolvedImageUrls((prev) => ({ ...prev, ...resolved }));
        });
      }
    }
    loadingMoreHistoryRef.current = false;
    setLoadingMoreHistory(false);
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container || suppressScrollDetectionRef.current) return;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const nearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
      isNearBottomRef.current = nearBottom;
      setShowJumpToLatest(!nearBottom);
      if (container.scrollTop < 200) loadMoreMessages();
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

  // Shared by both the initial send and a retry tap - a retry reuses the
  // same bubble (tempId) and the same local preview blobs rather than
  // starting over, so the user doesn't lose their place or re-pick photos.
  async function sendMessagePayload(tempId: string, payload: RetryPayload) {
    const { body, imageFiles, previewUrls, replyToId } = payload;
    if (!userId || !groupIdRef.current) return;
    const supabase = createClient();

    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, pending: true, failed: false, uploadingImages: imageFiles.length > 0 } : m))
    );

    let imageUrls: string[] = [];
    if (imageFiles.length > 0) {
      try {
        imageUrls = await Promise.all(
          imageFiles.map((file) => uploadChatPhoto(supabase, groupIdRef.current!, file))
        );
      } catch {
        // Kept as a failed bubble (not removed) so the typed text and photos
        // aren't lost - tapping retry re-runs this same function.
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, uploadingImages: false, failed: true } : m))
        );
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
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, pending: false, uploadingImages: false, failed: true } : m))
      );
      return;
    }

    trackEvent('chat_message_sent')

    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId
          ? {
              ...m,
              id: data.id,
              image_urls: data.image_urls,
              created_at: data.created_at,
              pending: false,
              uploadingImages: false,
              failed: false,
            }
          : m
      )
    );
    // Now that the bubble has switched over to the real hosted URLs, the
    // local preview blobs are safe to release.
    previewUrls.forEach((url) => URL.revokeObjectURL(url));

    if (data.image_urls.length > 0) {
      resolveChatPhotoUrls(supabase, data.image_urls).then((resolved) => {
        setResolvedImageUrls((prev) => ({ ...prev, ...resolved }));
      });
    }
  }

  async function handleSend({ body, imageFiles }: { body: string; imageFiles: File[] }) {
    if (!userId || !groupIdRef.current) return;
    const tempId = crypto.randomUUID();
    const replyToId = replyingTo?.id ?? null;

    // Local object URLs give an instant preview of the exact photos being
    // sent (rather than a blank bubble) while the real upload is still in
    // flight - uploadingImages drives a spinner overlay on top of them.
    const previewUrls = imageFiles.map((file) => URL.createObjectURL(file));
    const retryPayload: RetryPayload = { body, imageFiles, previewUrls, replyToId };

    const optimisticMessage: PendingChatMessage = {
      id: tempId,
      body,
      created_by: userId,
      group_id: groupIdRef.current,
      image_urls: previewUrls,
      reply_to_id: replyToId,
      edited_at: null,
      created_at: new Date().toISOString(),
      shared_kind: null,
      shared_ref_id: null,
      shared_title: null,
      shared_subtitle: null,
      profiles: {
        display_name: profilesRef.current[userId]?.display_name ?? "You",
        avatar_color: profilesRef.current[userId]?.avatar_color ?? null,
        avatar_url: profilesRef.current[userId]?.avatar_url ?? null,
      },
      pending: true,
      uploadingImages: imageFiles.length > 0,
      failed: false,
      retryPayload,
    };
    // Sending is an explicit action - always jump to the new message even if
    // the user had scrolled up to read history.
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyingTo(null);

    await sendMessagePayload(tempId, retryPayload);
  }

  function handleRetrySend(message: PendingChatMessage) {
    if (!message.retryPayload) return;
    sendMessagePayload(message.id, message.retryPayload);
  }

  function handleDiscardFailed(message: PendingChatMessage) {
    message.image_urls.forEach((url) => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
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
        setReactionsByMessage((prev) => {
          const current = prev[messageId] ?? [];
          // The realtime echo of this same insert can land before this
          // response does, adding the row under its real id while the temp
          // entry (a different, random id) is still present - drop any
          // pre-existing copy of the real id before swapping the temp in,
          // so the two never coexist as a visible duplicate.
          const deduped = current.filter((r) => r.id !== data.id).map((r) => (r.id === tempReaction.id ? data : r));
          return { ...prev, [messageId]: deduped };
        });
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

  async function handleDeleteMessage(message: PendingChatMessage) {
    const messageId = message.id;
    const supabase = createClient();
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setReactionsByMessage((prev) => {
      if (!(messageId in prev)) return prev;
      const rest = { ...prev };
      delete rest[messageId];
      return rest;
    });
    await supabase.from("chat_messages").delete().eq("id", messageId);
    // Deleting the row doesn't touch Storage on its own - without this, a
    // "deleted" photo message's images stay sitting in the bucket and (now
    // that reads are group-scoped, not just unguessable) remain fetchable
    // by any other member indefinitely via their old signed-URL path.
    if (message.image_urls.length > 0) {
      const paths = message.image_urls.map(extractChatPhotoPath);
      await supabase.storage.from("chat-photos").remove(paths);
    }
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
      {/* Visually hidden - announces new messages from other people to screen
          readers, since they otherwise append to the DOM with no signal. */}
      <div aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          data-chat-scroll-container
          className="h-full overflow-y-auto p-4"
        >
          {loadingMoreHistory && (
            <div className="flex justify-center pb-3">
              <CircleNotch size={18} className="animate-spin text-muted" />
            </div>
          )}
          {!hasMoreHistory && !loadingMoreHistory && messages.length > 0 && (
            <p className="pb-3 text-center text-xs text-muted">Beginning of conversation</p>
          )}
          {messages.length === 0 && (
            <EmptyState
              icon={HandWaving}
              title="Say hello!"
              subtitle="This is the start of your group chat. Send the first message."
              onClick={() => composerInputRef.current?.focus()}
            />
          )}
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showDaySeparator =
              !previous || !isSameLocalDay(new Date(message.created_at), new Date(previous.created_at));
            const showNewDivider = message.id === firstUnreadId;
            return (
            <div key={message.id} data-message-id={message.id} ref={observeMessageEl}>
              {showDaySeparator && (
                // Each message has its own wrapper div (for a stable
                // per-message DOM handle - see observeMessageEl), so this
                // separator is always its wrapper's first child; a
                // first:mt-0 CSS class would zero the top margin on every
                // separator, not just the one at the very top of the whole
                // list, collapsing it flush against the previous bubble.
                <div className={cn("my-4 flex items-center justify-center", index === 0 && "mt-0")}>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-secondary">
                    {chatDayLabel(new Date(message.created_at))}
                  </span>
                </div>
              )}
              {showNewDivider && !showDaySeparator && (
                <div className="my-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-accent/40" />
                  <span className="text-xs font-medium text-accent">New messages</span>
                  <div className="h-px flex-1 bg-accent/40" />
                </div>
              )}
              <MessageBubble
                message={message}
                isOwn={message.created_by === userId}
                pending={message.pending}
                uploadingImages={message.uploadingImages}
                failed={message.failed}
                groupStart={isGroupStart(message, messages[index - 1])}
                isFirstMessage={index === 0}
                reactions={reactionsByMessage[message.id] ?? []}
                currentUserId={userId}
                replyToMessage={message.reply_to_id ? messagesById.get(message.reply_to_id) : null}
                replyToDeleted={Boolean(message.reply_to_id) && !messagesById.has(message.reply_to_id ?? "")}
                isEditing={editingMessageId === message.id}
                resolveImageUrl={(raw) => resolvedImageUrls[raw] ?? null}
                memberNames={memberNames}
                onDoubleTapReact={() => handleToggleReaction(message.id, DEFAULT_REACTION)}
                onOpenActions={() => setActionSheetMessageId(message.id)}
                onToggleReaction={(emoji) => handleToggleReaction(message.id, emoji)}
                onSaveEdit={(body) => handleSaveEdit(message.id, body)}
                onCancelEdit={() => setEditingMessageId(null)}
                onRetry={() => handleRetrySend(message)}
                onDiscardFailed={() => handleDiscardFailed(message)}
              />
            </div>
            );
          })}
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
        memberNames={memberNames}
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
          if (deleteConfirmMessage) handleDeleteMessage(deleteConfirmMessage);
          setDeleteConfirmMessage(null);
        }}
        onCancel={() => setDeleteConfirmMessage(null)}
      />
    </div>
  );
}
