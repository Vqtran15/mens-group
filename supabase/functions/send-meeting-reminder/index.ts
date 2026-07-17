import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

interface RecurrenceConfig {
  dayOfWeek: number;
  occurrencesInMonth: number[];
  timeOfDay: string;
  timezone: string;
}

// Deno Deploy runs in UTC, so plain Date getters/setters can't represent
// "6pm in the group's own timezone" - every date computation below has to
// go through these two helpers instead of touching local Date fields
// directly.

// What year/month/day/hour/minute does `instant` read as, in `timeZone`?
function readInZone(instant: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

// The inverse: what UTC instant corresponds to this wall-clock date/time in
// `timeZone`? Standard "round-trip through Intl" technique - guess the
// instant by treating the wall-clock values as UTC, see what that guess
// actually reads as in the target zone, then shift by the difference. One
// pass is enough outside the handful of minutes spanning a DST transition,
// which a fixed evening meeting time is never going to land in.
function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const asRead = readInZone(guess, timeZone);
  const asIfUtc = Date.UTC(asRead.year, asRead.month - 1, asRead.day, asRead.hour, asRead.minute);
  const offset = guess.getTime() - asIfUtc;
  return new Date(guess.getTime() + offset);
}

function toDateOnlyString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getNextOccurrence(config: RecurrenceConfig, from: Date, skipDates: Set<string>): Date {
  // Anchor the month/day search to the group's own current calendar date,
  // not the server's UTC one - matters right around midnight in either
  // direction near a month boundary.
  const nowInZone = readInZone(from, config.timezone);
  let year = nowInZone.year;
  let month = nowInZone.month - 1;

  for (let monthsAhead = 0; monthsAhead < 3; monthsAhead++) {
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    let matchIndex = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      // A calendar date's weekday is a pure calendar fact, independent of
      // timezone - noon UTC keeps it well clear of any date-line edge case.
      const dayOfWeek = new Date(Date.UTC(year, month, day, 12)).getUTCDay();
      if (dayOfWeek === config.dayOfWeek) {
        matchIndex++;
        if (config.occurrencesInMonth.includes(matchIndex) && !skipDates.has(toDateOnlyString(year, month + 1, day))) {
          const [hours, minutes] = config.timeOfDay.split(":").map(Number);
          const candidate = zonedTimeToUtc(year, month + 1, day, hours, minutes, config.timezone);
          if (candidate.getTime() >= from.getTime()) return candidate;
        }
      }
    }
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  throw new Error("No upcoming occurrence found within 3 months");
}

// Matches the 12-hour "2:00 PM" style used everywhere else time is shown in
// the app (see formatTime() in lib/utils.ts) - the DB stores time_of_day as
// 24-hour "HH:MM:SS", which isn't what a reminder notification should read.
function formatTimeOfDay(timeOfDay: string): string {
  const [hourStr, minute] = timeOfDay.split(":");
  const hour = Number(hourStr);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

function isSameCalendarDay(a: Date, b: Date, timeZone: string): boolean {
  const aInZone = readInZone(a, timeZone);
  const bInZone = readInZone(b, timeZone);
  return aInZone.year === bInZone.year && aInZone.month === bInZone.month && aInZone.day === bInZone.day;
}

Deno.serve(async () => {
  const { data: schedules } = await supabase
    .from("meeting_schedule")
    .select("*")
    .eq("active", true);

  if (!schedules || schedules.length === 0) {
    return Response.json({ skipped: "no active schedules" });
  }

  const now = new Date();
  // This function is invoked hourly (see the 'meeting-reminder-hourly' pg_cron
  // job). A meeting's next occurrence only ever falls inside this rolling
  // [23h, 24h) window during a single one of those hourly ticks, so each
  // occurrence gets exactly one reminder, roughly 24 hours out, without
  // needing to track "already notified" state anywhere.
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const results = [];

  for (const schedule of schedules) {
    const next = getNextOccurrence(
      {
        dayOfWeek: schedule.day_of_week,
        occurrencesInMonth: schedule.occurrences_in_month,
        timeOfDay: schedule.time_of_day,
        timezone: schedule.timezone,
      },
      now,
      new Set<string>(schedule.skipped_dates ?? [])
    );

    if (next.getTime() < windowStart.getTime() || next.getTime() >= windowEnd.getTime()) {
      results.push({ group_id: schedule.group_id, skipped: "next meeting not ~24h out", next });
      continue;
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("group_id", schedule.group_id);

    // A 24h-out window almost always lands on the calendar day before the
    // meeting, but a group whose timezone offset differs enough from the
    // server's UTC tick boundaries could still see it land same-day, so the
    // label is still derived rather than hardcoded to "Tomorrow". Compared
    // in the group's own timezone, not the server's, so the label matches
    // what the group would call "today".
    const dayLabel = isSameCalendarDay(next, now, schedule.timezone) ? "Today" : "Tomorrow";
    const notification = JSON.stringify({
      title: schedule.label,
      body: `${dayLabel} at ${formatTimeOfDay(schedule.time_of_day)}${schedule.location ? " — " + schedule.location : ""}`,
      url: "/calendar",
    });

    let sent = 0;
    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notification
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    results.push({ group_id: schedule.group_id, sent, total: subscriptions?.length ?? 0 });
  }

  return Response.json({ results });
});
