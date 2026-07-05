"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatText, MagnifyingGlass, X } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { TopicListItem } from "@/components/topics/TopicListItem";
import { useTopicsSearch } from "@/components/topics/TopicsSearchContext";
import { useUnreadIndicator } from "@/components/UnreadIndicatorContext";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { parseDateOnly } from "@/lib/utils";
import type { Topic } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function monthLabel(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function TopicsView() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const { query, setQuery, open: searchOpen, setOpen: setSearchOpen } = useTopicsSearch();
  const { markTopicsSeen } = useUnreadIndicator();

  const loadTopics = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("topics")
      .select("*, profiles(display_name, avatar_color)")
      .order("topic_date", { ascending: false })
      .order("created_at", { ascending: false });
    setTopics(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      await loadTopics();
      markTopicsSeen();
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTopics]);

  // Reset shared search state when leaving the page, so it doesn't come back
  // stale (still open, old query) the next time this page mounts.
  useEffect(() => {
    return () => {
      setSearchOpen(false);
      setQuery("");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((topic) => {
      const haystack = `${topic.title} ${stripHtml(topic.description ?? "")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [topics, query]);

  // Topics are already sorted by topic_date descending, so consecutive
  // same-month topics are always contiguous - a single pass is enough.
  const groupedTopics = useMemo(() => {
    const groups: { label: string; topics: Topic[] }[] = [];
    for (const topic of filteredTopics) {
      const label = monthLabel(topic.topic_date);
      const currentGroup = groups[groups.length - 1];
      if (currentGroup?.label === label) {
        currentGroup.topics.push(topic);
      } else {
        groups.push({ label, topics: [topic] });
      }
    }
    return groups;
  }, [filteredTopics]);

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <PullToRefresh onRefresh={loadTopics}>
    <div className="space-y-4 p-4">
      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="relative overflow-hidden"
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
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-9 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
        )}
      </AnimatePresence>

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
        <div className="space-y-4">
          {groupedTopics.map((group) => (
            <div key={group.label} className="space-y-3">
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </p>
              {group.topics.map((topic, i) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.04 }}
                >
                  <TopicListItem topic={topic} onChanged={loadTopics} />
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
