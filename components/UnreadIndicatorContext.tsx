"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";

interface UnreadState {
  chatUnread: boolean;
  topicsUnread: boolean;
  markChatSeen: () => void;
  markTopicsSeen: () => void;
}

const UnreadContext = createContext<UnreadState | null>(null);

function chatSeenKey(groupId: string) {
  return `chat-last-seen-${groupId}`;
}

function topicsSeenKey(groupId: string) {
  return `topics-last-seen-${groupId}`;
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
  const [topicsUnread, setTopicsUnread] = useState(false);
  const groupIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let chatChannel: ReturnType<typeof supabase.channel> | null = null;
    let topicsChannel: ReturnType<typeof supabase.channel> | null = null;
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
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: latestTopic } = await supabase
        .from("topics")
        .select("created_at")
        .eq("group_id", membership.groupId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (latestMessage && latestMessage.created_by !== membership.userId) {
        setChatUnread(isNewerThanStored(latestMessage.created_at, chatSeenKey(membership.groupId)));
      }
      if (latestTopic) {
        setTopicsUnread(isNewerThanStored(latestTopic.created_at, topicsSeenKey(membership.groupId)));
      }

      chatChannel = supabase
        .channel("unread_chat_messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          (payload) => {
            const row = payload.new as { group_id: string; created_by: string };
            if (row.group_id === groupIdRef.current && row.created_by !== userIdRef.current) {
              setChatUnread(true);
            }
          }
        )
        .subscribe();

      topicsChannel = supabase
        .channel("unread_topics")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "topics" },
          (payload) => {
            const row = payload.new as { group_id: string };
            if (row.group_id === groupIdRef.current) {
              setTopicsUnread(true);
            }
          }
        )
        .subscribe();
    }

    init();

    return () => {
      cancelled = true;
      if (chatChannel) supabase.removeChannel(chatChannel);
      if (topicsChannel) supabase.removeChannel(topicsChannel);
    };
  }, []);

  function markChatSeen() {
    if (groupIdRef.current) {
      localStorage.setItem(chatSeenKey(groupIdRef.current), new Date().toISOString());
    }
    setChatUnread(false);
  }

  function markTopicsSeen() {
    if (groupIdRef.current) {
      localStorage.setItem(topicsSeenKey(groupIdRef.current), new Date().toISOString());
    }
    setTopicsUnread(false);
  }

  return (
    <UnreadContext.Provider value={{ chatUnread, topicsUnread, markChatSeen, markTopicsSeen }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnreadIndicator() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnreadIndicator must be used within UnreadIndicatorProvider");
  return ctx;
}
