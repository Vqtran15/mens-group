"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";

interface UnreadState {
  chatUnread: boolean;
  markChatSeen: () => void;
  // ChatView calls this on mount/unmount. This provider has its own
  // realtime subscription to chat_messages (see below) independent of
  // ChatView's - without this flag, a message arriving while chat is
  // already open races ChatView's own markChatSeen() against this
  // provider's INSERT handler, and whichever runs last wins. Since there's
  // no ordering guarantee between two independent subscriptions reacting
  // to the same event, the badge could stay lit even while you're looking
  // right at the message. Gating this provider's own unread-setting logic
  // on "is chat currently open" removes the race instead of trying to win it.
  setChatOpen: (open: boolean) => void;
}

const UnreadContext = createContext<UnreadState | null>(null);

// Exported so ChatView can read the pre-visit value itself (to find the
// first unread message) before markChatSeen() below overwrites it.
export function chatSeenKey(groupId: string) {
  return `chat-last-seen-${groupId}`;
}

function isNewerThanStored(candidate: string, storedKey: string): boolean {
  const stored = localStorage.getItem(storedKey);
  if (!stored) return true;
  return new Date(candidate).getTime() > new Date(stored).getTime();
}

// "Seen" state lives in localStorage (per-device, not synced across a
// member's devices) rather than a DB column - avoids a schema change for
// what's otherwise a purely cosmetic nav badge.
export function UnreadIndicatorProvider({ children }: { children: React.ReactNode }) {
  const [chatUnread, setChatUnread] = useState(false);
  const groupIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const chatOpenRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let chatChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function init() {
      const membership = await getCurrentMembership(supabase);
      if (!membership || cancelled) return;
      groupIdRef.current = membership.groupId;
      userIdRef.current = membership.userId;

      const { data: latestMessage } = await supabase
        .from("chat_messages")
        .select("created_at, created_by")
        .eq("group_id", membership.groupId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      // If chat is already open by the time this resolves, ChatView's own
      // markChatSeen() owns the "seen" state instead - deferring to it here
      // (rather than also computing our own answer) is what avoids the
      // race described above.
      if (!chatOpenRef.current && latestMessage && latestMessage.created_by !== membership.userId) {
        setChatUnread(isNewerThanStored(latestMessage.created_at, chatSeenKey(membership.groupId)));
      }

      chatChannel = supabase
        .channel("unread_chat_messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload) => {
            const row = payload.new as { group_id: string; created_by: string };
            if (
              row.group_id === groupIdRef.current &&
              row.created_by !== userIdRef.current &&
              !chatOpenRef.current
            ) {
              setChatUnread(true);
            }
          }
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (chatChannel) supabase.removeChannel(chatChannel);
    };
  }, []);

  // Mirrors chatUnread onto the home-screen app icon badge (iOS/Android PWA
  // installs). Feature-detected - most desktop browsers don't support the
  // Badging API and this is a no-op there. This also covers clearing the
  // badge that the service worker's push handler may have set while the app
  // was closed, since this effect re-evaluates as soon as the app is opened.
  // Both calls can reject (e.g. not installed as a home-screen app) - not
  // fatal, so swallow it instead of an unhandled rejection.
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    if (chatUnread) {
      navigator.setAppBadge(1).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [chatUnread]);

  // useCallback so these have a stable identity - ChatView depends on
  // setChatOpen in a mount/unmount-only effect, and a fresh function
  // reference on every provider render would otherwise fire that effect's
  // cleanup/setup on every unrelated re-render too.
  const markChatSeen = useCallback(() => {
    if (groupIdRef.current) {
      localStorage.setItem(chatSeenKey(groupIdRef.current), new Date().toISOString());
    }
    setChatUnread(false);
  }, []);

  const setChatOpen = useCallback((open: boolean) => {
    chatOpenRef.current = open;
  }, []);

  return (
    <UnreadContext.Provider value={{ chatUnread, markChatSeen, setChatOpen }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnreadIndicator() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnreadIndicator must be used within UnreadIndicatorProvider");
  return ctx;
}
