"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { PastEventListItem } from "@/components/calendar/PastEventListItem";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { startOfToday, toDateOnlyString } from "@/lib/utils";
import type { CalendarEvent, RelatedTopic, Rsvp } from "@/lib/types";

const PAGE_SIZE = 20;

const eventsSelect =
  "*, rsvps(id, event_id, user_id, status, created_at, updated_at, profiles(display_name, avatar_color, avatar_url))";

export function PastEventsView() {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rsvpsByEvent, setRsvpsByEvent] = useState<Record<string, Rsvp[]>>({});
  const [topicsByDate, setTopicsByDate] = useState<Record<string, RelatedTopic[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Dedupes by id when merging a page in, rather than blindly appending -
  // React's dev-mode Strict Mode double-invokes effects, so the initial
  // load's effect runs twice; without this, the first page would render
  // twice over (duplicate cards, doubled RSVP counts).
  const appendPage = useCallback((rows: (CalendarEvent & { rsvps: Rsvp[] })[]) => {
    const rsvpMap: Record<string, Rsvp[]> = {};
    const cleanEvents: CalendarEvent[] = [];
    for (const row of rows) {
      const { rsvps, ...event } = row;
      rsvpMap[event.id] = rsvps ?? [];
      cleanEvents.push(event);
    }
    setEvents((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      return [...prev, ...cleanEvents.filter((e) => !existingIds.has(e.id))];
    });
    setRsvpsByEvent((prev) => ({ ...prev, ...rsvpMap }));
    setHasMore(rows.length === PAGE_SIZE);
  }, []);

  const loadFirstPage = useCallback(async (currentGroupId: string) => {
    const supabase = createClient();
    const [{ data: eventRows }, { data: topicRows }] = await Promise.all([
      supabase
        .from("events")
        .select(eventsSelect)
        .eq("group_id", currentGroupId)
        .lt("starts_at", startOfToday().toISOString())
        .order("starts_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase.from("topics").select("id, title, topic_date").eq("group_id", currentGroupId),
    ]);

    const dateMap: Record<string, RelatedTopic[]> = {};
    for (const topic of topicRows ?? []) {
      dateMap[topic.topic_date] = [...(dateMap[topic.topic_date] ?? []), { id: topic.id, title: topic.title }];
    }
    setTopicsByDate(dateMap);
    appendPage((eventRows ?? []) as (CalendarEvent & { rsvps: Rsvp[] })[]);
    setLoading(false);
  }, [appendPage]);

  const loadMore = useCallback(async () => {
    if (!groupId || events.length === 0 || loadingMore) return;
    setLoadingMore(true);
    const supabase = createClient();
    const oldest = events[events.length - 1];
    const { data: eventRows } = await supabase
      .from("events")
      .select(eventsSelect)
      .eq("group_id", groupId)
      .lt("starts_at", oldest.starts_at)
      .order("starts_at", { ascending: false })
      .limit(PAGE_SIZE);
    appendPage((eventRows ?? []) as (CalendarEvent & { rsvps: Rsvp[] })[]);
    setLoadingMore(false);
  }, [groupId, events, loadingMore, appendPage]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const membership = await getCurrentMembership(supabase);
      if (!membership) return;
      setGroupId(membership.groupId);
      loadFirstPage(membership.groupId);
    }
    init();
  }, [loadFirstPage]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {events.length === 0 ? (
        <EmptyState
          icon={ClockCounterClockwise}
          title="No past events yet"
          subtitle="Meetings move here once their day has passed."
        />
      ) : (
        <>
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: Math.min(i, 8) * 0.05 }}
            >
              <PastEventListItem
                event={event}
                rsvps={rsvpsByEvent[event.id] ?? []}
                relatedTopics={topicsByDate[toDateOnlyString(new Date(event.starts_at))] ?? []}
              />
            </motion.div>
          ))}
          {hasMore && (
            <Button variant="secondary" className="w-full" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
