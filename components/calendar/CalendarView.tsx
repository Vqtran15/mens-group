"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarBlank, CaretRight, Repeat } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { getUpcomingOccurrences, toRecurrenceConfig } from "@/lib/recurrence";
import { NextMeetingCard } from "@/components/calendar/NextMeetingCard";
import { EventListItem } from "@/components/calendar/EventListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { toDateOnlyString } from "@/lib/utils";
import type { CalendarEvent, MeetingSchedule, RelatedTopic, Rsvp } from "@/lib/types";

const OCCURRENCES_TO_MATERIALIZE = 3;

const MotionLink = motion.create(Link);

export function CalendarView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [hasSchedule, setHasSchedule] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rsvpsByEvent, setRsvpsByEvent] = useState<Record<string, Rsvp[]>>({});
  const [topicsByDate, setTopicsByDate] = useState<Record<string, RelatedTopic[]>>({});
  const [loading, setLoading] = useState(true);

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
    setHasSchedule(!!schedule);

    if (schedule) {
      const occurrences = getUpcomingOccurrences(
        toRecurrenceConfig(schedule),
        OCCURRENCES_TO_MATERIALIZE,
        new Date(),
        new Set(schedule.skipped_dates)
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
    return null;
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

      {!hasSchedule && (
        <MotionLink
          href="/calendar/schedule/edit"
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-white/60 px-4 py-3 text-primary transition-colors hover:bg-white/80"
        >
          <Repeat size={18} className="shrink-0" />
          <span className="flex-1 text-sm font-medium">Set up a recurring meeting</span>
          <CaretRight size={16} className="text-muted" />
        </MotionLink>
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-primary">
            Upcoming
          </h2>
          {rest.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.08 * (i + 1) }}
            >
              <EventListItem
                event={event}
                rsvps={rsvpsByEvent[event.id] ?? []}
                userId={userId}
                onChanged={() => loadEvents(userId, groupId)}
                relatedTopics={topicsByDate[toDateOnlyString(new Date(event.starts_at))] ?? []}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
