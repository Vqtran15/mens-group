"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChatText, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { TopicListItem } from "@/components/topics/TopicListItem";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Topic } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

export function TopicsView() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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

  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((topic) => {
      const haystack = `${topic.title} ${stripHtml(topic.description ?? "")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [topics, query]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-end">
        <Link
          href="/topics/new"
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-primary/30 transition-transform active:scale-95"
        >
          <Plus size={16} /> Add topic
        </Link>
      </div>

      {!loading && topics.length > 0 && (
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics..."
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

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
      ) : filteredTopics.length === 0 ? (
        <EmptyState icon={MagnifyingGlass} title="No topics found" subtitle={`Nothing matches "${query}"`} />
      ) : (
        <div className="space-y-3">
          {filteredTopics.map((topic, i) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.04 }}
            >
              <TopicListItem topic={topic} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
