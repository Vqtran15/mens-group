"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarBlank, CaretDown } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { getUpcomingOccurrences, toRecurrenceConfig } from "@/lib/recurrence";
import { NextMeetingCard } from "@/components/calendar/NextMeetingCard";
import { EventListItem } from "@/components/calendar/EventListItem";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { toDateOnlyString } from "@/lib/utils";
import type { CalendarEvent, MeetingSchedule, RelatedTopic, Rsvp } from "@/lib/types";

const OCCURRENCES_TO_MATERIALIZE = 3;

export function CalendarView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rsvpsByEvent, setRsvpsByEvent] = useState<Record<string, Rsvp[]>>({});
  const [topicsByDate, setTopicsByDate] = useState<Record<string, RelatedTopic[]>>({});
  const [loading, setLoading] = useState(true);
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  const loadEvents = useCallback(async (currentUserId: string, groupId: string) => {
    const supabase = createClient();
    const eventsSelect =
      "*, rsvps(id, event_id, user_id, status, created_at, updated_at, profiles(display_name, avatar_color))";

    // These three are independent of each other, so fetch them together -
    // the schedule/topics round trips no longer sit in front of the events
    // query one at a time.
    const [{ data: schedule }, { data: eventRows }, { data: topicRows }] = await Promise.all([
      supabase
        .from("meeting_schedule")
        .select("*")
        .eq("group_id", groupId)
        .eq("active", true)
        .limit(1)
        .maybeSingle<MeetingSchedule>(),
      supabase
        .from("events")
        .select(eventsSelect)
        .eq("group_id", groupId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20),
      supabase.from("topics").select("id, title, topic_date").eq("group_id", groupId),
    ]);

    let finalEventRows = eventRows;

    if (schedule) {
      const occurrences = getUpcomingOccurrences(
        toRecurrenceConfig(schedule),
        OCCURRENCES_TO_MATERIALIZE
      );
      const occurrenceTimes = new Set(occurrences.map((d) => d.getTime()));
      const scheduleEventRows = (eventRows ?? []).filter((e) => e.schedule_id === schedule.id);

      // Most loads already have every upcoming occurrence materialized from a
      // prior visit - only pay for the write (and a re-fetch) when one is
      // actually missing, instead of upserting identical rows every time.
      const existingTimes = new Set(scheduleEventRows.map((e) => new Date(e.starts_at).getTime()));
      const missing = occurrences.filter((date) => !existingTimes.has(date.getTime()));

      // Anything already materialized beyond the current target count (e.g.
      // left over from before OCCURRENCES_TO_MATERIALIZE was lowered) no
      // longer belongs in "next N" and gets cleared out too, rather than
      // lingering just because it was written under an older, higher count.
      const staleIds = scheduleEventRows
        .filter((e) => !occurrenceTimes.has(new Date(e.starts_at).getTime()))
        .map((e) => e.id);

      let needsRefresh = false;

      if (missing.length > 0) {
        const rows = missing.map((date) => {
          const endsAt = new Date(date.getTime() + schedule.duration_minutes * 60_000);
          return {
            title: schedule.label,
            starts_at: date.toISOString(),
            ends_at: endsAt.toISOString(),
            location: schedule.location,
            created_by: currentUserId,
            is_recurring: true,
            schedule_id: schedule.id,
            group_id: groupId,
          };
        });
        await supabase.from("events").upsert(rows, { onConflict: "schedule_id,starts_at" });
        needsRefresh = true;
      }

      if (staleIds.length > 0) {
        await supabase.from("events").delete().in("id", staleIds);
        needsRefresh = true;
      }

      if (needsRefresh) {
        const { data: refreshedEventRows } = await supabase
          .from("events")
          .select(eventsSelect)
          .eq("group_id", groupId)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(20);
        finalEventRows = refreshedEventRows;
      }
    }

    const rsvpMap: Record<string, Rsvp[]> = {};
    const cleanEvents: CalendarEvent[] = [];
    for (const row of finalEventRows ?? []) {
      const { rsvps, ...event } = row as CalendarEvent & { rsvps: Rsvp[] };
      rsvpMap[event.id] = rsvps ?? [];
      cleanEvents.push(event);
    }

    const dateMap: Record<string, RelatedTopic[]> = {};
    for (const topic of topicRows ?? []) {
      dateMap[topic.topic_date] = [...(dateMap[topic.topic_date] ?? []), { id: topic.id, title: topic.title }];
    }

    setEvents(cleanEvents);
    setRsvpsByEvent(rsvpMap);
    setTopicsByDate(dateMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const membership = await getCurrentMembership(supabase);
      if (!membership) return;

      setUserId(membership.userId);
      setGroupId(membership.groupId);
      loadEvents(membership.userId, membership.groupId);
    }

    init();
  }, [loadEvents]);

  if (loading || !userId || !groupId) {
    return (
      <div className="space-y-4 p-4">
        <div className="rounded-2xl bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-14 w-14 shrink-0 rounded-xl bg-primary/15" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3 w-24 bg-primary/15" />
              <Skeleton className="h-5 w-3/4 bg-primary/15" />
              <Skeleton className="h-4 w-1/3 bg-primary/15" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full bg-primary/15" />
            <Skeleton className="h-8 w-20 rounded-full bg-primary/15" />
            <Skeleton className="h-8 w-14 rounded-full bg-primary/15" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  }

  const [nextMeeting, ...rest] = events;

  return (
    <PullToRefresh onRefresh={() => loadEvents(userId, groupId)}>
    <div className="space-y-4 p-4">
      {nextMeeting ? (
        <NextMeetingCard
          event={nextMeeting}
          rsvps={rsvpsByEvent[nextMeeting.id] ?? []}
          userId={userId}
          onChanged={() => loadEvents(userId, groupId)}
          relatedTopics={topicsByDate[toDateOnlyString(new Date(nextMeeting.starts_at))] ?? []}
        />
      ) : (
        <EmptyState
          icon={CalendarBlank}
          title="Nothing on the calendar"
          subtitle="Plan a hangout and let everyone know!"
        />
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setUpcomingOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-surface-muted/60"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              Upcoming ({rest.length})
            </h2>
            <motion.span
              animate={{ rotate: upcomingOpen ? 0 : -90 }}
              transition={{ duration: 0.2 }}
              className="text-primary"
            >
              <CaretDown size={16} />
            </motion.span>
          </motion.button>
          <AnimatePresence initial={false}>
            {upcomingOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="space-y-3 overflow-hidden"
              >
                {rest.map((event) => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    rsvps={rsvpsByEvent[event.id] ?? []}
                    userId={userId}
                    onChanged={() => loadEvents(userId, groupId)}
                    relatedTopics={topicsByDate[toDateOnlyString(new Date(event.starts_at))] ?? []}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
