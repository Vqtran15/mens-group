"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getUpcomingOccurrences, toRecurrenceConfig } from "@/lib/recurrence";
import { NextMeetingCard } from "@/components/calendar/NextMeetingCard";
import { EventListItem } from "@/components/calendar/EventListItem";
import type { CalendarEvent, MeetingSchedule, Rsvp } from "@/lib/types";

const OCCURRENCES_TO_MATERIALIZE = 6;

export function CalendarView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rsvpsByEvent, setRsvpsByEvent] = useState<Record<string, Rsvp[]>>({});
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async (currentUserId: string) => {
    const supabase = createClient();

    const { data: schedule } = await supabase
      .from("meeting_schedule")
      .select("*")
      .eq("active", true)
      .limit(1)
      .maybeSingle<MeetingSchedule>();

    if (schedule) {
      const occurrences = getUpcomingOccurrences(
        toRecurrenceConfig(schedule),
        OCCURRENCES_TO_MATERIALIZE
      );
      const rows = occurrences.map((date) => {
        const endsAt = new Date(date.getTime() + schedule.duration_minutes * 60_000);
        return {
          title: schedule.label,
          starts_at: date.toISOString(),
          ends_at: endsAt.toISOString(),
          location: schedule.location,
          created_by: currentUserId,
          is_recurring: true,
          schedule_id: schedule.id,
        };
      });
      await supabase.from("events").upsert(rows, { onConflict: "schedule_id,starts_at" });
    }

    const { data: eventRows } = await supabase
      .from("events")
      .select("*, rsvps(id, event_id, user_id, status, created_at, updated_at, profiles(display_name))")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);

    const rsvpMap: Record<string, Rsvp[]> = {};
    const cleanEvents: CalendarEvent[] = [];
    for (const row of eventRows ?? []) {
      const { rsvps, ...event } = row as CalendarEvent & { rsvps: Rsvp[] };
      rsvpMap[event.id] = rsvps ?? [];
      cleanEvents.push(event);
    }

    setEvents(cleanEvents);
    setRsvpsByEvent(rsvpMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        loadEvents(data.user.id);
      }
    });
  }, [loadEvents]);

  if (loading || !userId) {
    return <p className="p-4 text-secondary">Loading...</p>;
  }

  const [nextMeeting, ...rest] = events;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Calendar</h1>
        <Link
          href="/calendar/new"
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-white"
        >
          <Plus size={16} /> Add event
        </Link>
      </div>

      {nextMeeting ? (
        <NextMeetingCard
          event={nextMeeting}
          rsvps={rsvpsByEvent[nextMeeting.id] ?? []}
          userId={userId}
          onChanged={() => loadEvents(userId)}
        />
      ) : (
        <p className="text-secondary">No upcoming meetings scheduled.</p>
      )}

      {rest.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Upcoming
          </h2>
          {rest.map((event) => (
            <EventListItem
              key={event.id}
              event={event}
              rsvps={rsvpsByEvent[event.id] ?? []}
              userId={userId}
              onChanged={() => loadEvents(userId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
