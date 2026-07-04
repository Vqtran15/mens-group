"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatText, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { TopicListItem } from "@/components/topics/TopicListItem";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Topic } from "@/lib/types";

export function TopicsView() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("topics")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTopics(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Topics</h1>
        <Link
          href="/topics/new"
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-primary/30 transition-transform active:scale-95"
        >
          <Plus size={16} /> Add topic
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      ) : topics.length === 0 ? (
        <EmptyState
          icon={ChatText}
          title="Nothing to talk about yet"
          subtitle="Start a topic and get the conversation going!"
        />
      ) : (
        <div className="space-y-3">
          {topics.map((topic) => (
            <TopicListItem key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}
