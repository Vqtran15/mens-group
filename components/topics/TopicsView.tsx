"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatText, MagnifyingGlass, X } from "@phosphor-icons/react";
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
  const [searchOpen, setSearchOpen] = useState(false);

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

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <div className="space-y-4 p-4">
      {!loading && topics.length > 0 && (
        <div className="flex justify-end">
          <AnimatePresence mode="wait" initial={false}>
            {searchOpen ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, width: "40%" }}
                animate={{ opacity: 1, width: "100%" }}
                exit={{ opacity: 0, width: "40%" }}
                transition={{ duration: 0.18 }}
                className="relative"
              >
                <MagnifyingGlass
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search topics..."
                  className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-9 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition-colors hover:bg-surface-muted"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="icon"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSearchOpen(true)}
                aria-label="Search topics"
                className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted"
              >
                <MagnifyingGlass size={20} />
              </motion.button>
            )}
          </AnimatePresence>
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
