"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NoteThread } from "@/components/topics/NoteThread";
import { NoteComposer } from "@/components/topics/NoteComposer";
import type { Topic, TopicNote } from "@/lib/types";

export function TopicDetailView({ topicId }: { topicId: string }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [notes, setNotes] = useState<TopicNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabase = createClient();
      const [{ data: topicData }, { data: notesData }] = await Promise.all([
        supabase.from("topics").select("*").eq("id", topicId).single(),
        supabase
          .from("topic_notes")
          .select("*, profiles(display_name)")
          .eq("topic_id", topicId)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setTopic(topicData);
      setNotes(notesData ?? []);
      setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  const refetchNotes = useCallback(async () => {
    const supabase = createClient();
    const { data: notesData } = await supabase
      .from("topic_notes")
      .select("*, profiles(display_name)")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true });
    setNotes(notesData ?? []);
  }, [topicId]);

  if (loading) {
    return <p className="p-4 text-secondary">Loading...</p>;
  }

  if (!topic) {
    return <p className="p-4 text-secondary">Topic not found.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-semibold text-primary">{topic.title}</h1>
        {topic.description && <p className="mt-1 text-secondary">{topic.description}</p>}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <NoteThread notes={notes} />
      </div>
      <div className="border-t border-border p-4">
        <NoteComposer topicId={topicId} onAdded={refetchNotes} />
      </div>
    </div>
  );
}
