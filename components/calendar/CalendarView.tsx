"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarBlank, CaretRight, Repeat } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { OCCURRENCES_TO_MATERIALIZE } from "@/lib/recurrence";
import { reconcileScheduleEvents } from "@/lib/scheduleMaterialization";
import { NextMeetingCard } from "@/components/calendar/NextMeetingCard";
import { EventListItem } from "@/components/calendar/EventListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { startOfToday, toDateOnlyString } from "@/lib/utils";
import type { CalendarEvent, MeetingSchedule, RelatedTopic, Rsvp } from "@/lib/types";

const MotionLink = motion.create(Link);

export function CalendarView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [hasSchedule, setHasSchedule] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // Whether the featured event (events[0]) falls on today's calendar day -
  // computed once, at fetch time, rather than re-derived from `new Date()`
  // during render, which React's purity rules disallow (an impure call
  // whose result could differ render to render).
  const [featuredIsToday, setFeaturedIsToday] = useState(false);
  const [rsvpsByEvent, setRsvpsByEvent] = useState<Record<string, Rsvp[]>>({});
  const [topicsByDate, setTopicsByDate] = useState<Record<string, RelatedTopic[]>>({});
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async (currentUserId: string, groupId: string) => {
    const supabase = createClient();
    const eventsSelect =
      "*, rsvps(id, event_id, user_id, status, created_at, updated_at, profiles(display_name, avatar_color, avatar_url))";

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
        .gte("starts_at", startOfToday().toISOString())
        .order("starts_at", { ascending: true })
        .limit(20),
      supabase.from("topics").select("id, title, topic_date").eq("group_id", groupId),
    ]);

    let finalEventRows = eventRows;
    setHasSchedule(!!schedule);

    if (schedule) {
      const scheduleEventRows = (eventRows ?? []).filter((e) => e.schedule_id === schedule.id);
      const changed = await reconcileScheduleEvents(supabase, schedule, scheduleEventRows, currentUserId, groupId);

      if (changed) {
        const { data: refreshedEventRows } = await supabase
          .from("events")
          .select(eventsSelect)
          .eq("group_id", groupId)
          .gte("starts_at", startOfToday().toISOString())
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

    // OCCURRENCES_TO_MATERIALIZE only bounds how many *recurring* occurrences
    // get generated - one-off events sitting alongside them aren't capped by
    // that, so the calendar could show more than 3 total. Slicing the
    // already-soonest-first list down here caps what's actually shown to 3,
    // regardless of how many of those are recurring vs one-off.
    const slicedEvents = cleanEvents.slice(0, OCCURRENCES_TO_MATERIALIZE);
    // The events query already starts at startOfToday(), so the earliest
    // item - if any - is either happening today or is the next future day;
    // either way it's exactly what belongs in the featured slot. The label
    // just needs to know which of those two cases it is.
    const featured = slicedEvents[0];
    setEvents(slicedEvents);
    setFeaturedIsToday(!!featured && toDateOnlyString(new Date(featured.starts_at)) === toDateOnlyString(startOfToday()));
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
    <div className="space-y-4 p-4">
      {nextMeeting && (
        <NextMeetingCard
          event={nextMeeting}
          rsvps={rsvpsByEvent[nextMeeting.id] ?? []}
          userId={userId}
          onChanged={() => loadEvents(userId, groupId)}
          relatedTopics={topicsByDate[toDateOnlyString(new Date(nextMeeting.starts_at))] ?? []}
          isToday={featuredIsToday}
        />
      )}
      {!nextMeeting && (
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
  );
}
