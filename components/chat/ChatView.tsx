"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageComposer } from "@/components/chat/MessageComposer";
import type { ChatMessage } from "@/lib/types";

export function ChatView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const profilesRef = useRef<Record<string, string>>({});
  const userIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setUserId(userData.user.id);
      userIdRef.current = userData.user.id;

      const { data: profiles } = await supabase.from("profiles").select("id, display_name");
      for (const p of profiles ?? []) {
        profilesRef.current[p.id] = p.display_name;
      }

      const { data: initialMessages } = await supabase
        .from("chat_messages")
        .select("*, profiles(display_name)")
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages(initialMessages ?? []);
      setLoading(false);
    }

    init();

    // Only other members' messages come through realtime; the sender's own
    // message is added optimistically and finalized via the insert response,
    // which avoids a race between the realtime echo and that response.
    const channel = supabase
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
              { ...row, profiles: { display_name: profilesRef.current[row.created_by] ?? "Someone" } },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(body: string) {
    if (!userId) return;
    const supabase = createClient();
    const tempId = crypto.randomUUID();
    const optimisticMessage: ChatMessage = {
      id: tempId,
      body,
      created_by: userId,
      created_at: new Date().toISOString(),
      profiles: { display_name: profilesRef.current[userId] ?? "You" },
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({ body, created_by: userId })
      .select()
      .single();

    if (error || !data) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...optimisticMessage, id: data.id, created_at: data.created_at } : m
      )
    );
  }

  if (loading || !userId) {
    return <p className="p-4 text-secondary">Loading...</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} isOwn={message.created_by === userId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageComposer onSend={handleSend} />
    </div>
  );
}
