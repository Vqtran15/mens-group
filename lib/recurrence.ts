import type { MeetingSchedule } from "@/lib/types";

export interface RecurrenceConfig {
  dayOfWeek: number;
  occurrencesInMonth: number[];
  timeOfDay: string;
  durationMinutes: number;
  timezone: string;
}

// How many upcoming occurrences of a recurring schedule stay materialized as
// `events` rows at once. Shared by CalendarView (which tops this up as
// occurrences pass) and MeetingScheduleForm (which recomputes this same
// window against a freshly saved schedule) so the two never disagree about
// what "the next N occurrences" means.
export const OCCURRENCES_TO_MATERIALIZE = 3;

export function toRecurrenceConfig(schedule: MeetingSchedule): RecurrenceConfig {
  return {
    dayOfWeek: schedule.day_of_week,
    occurrencesInMonth: schedule.occurrences_in_month,
    timeOfDay: schedule.time_of_day,
    durationMinutes: schedule.duration_minutes,
    timezone: schedule.timezone,
  };
}

// A browser's own local timezone almost never matches the group's chosen
// meeting timezone (schedule.timezone) - someone traveling, or with their
// device clock set to anything else, would otherwise compute a different
// UTC instant for "the same" meeting than what's already stored, which
// previously caused every occurrence to look "stale" and get deleted along
// with its RSVPs. Every date computation below goes through these two
// zone-aware helpers instead of touching local Date fields directly - the
// same technique already proven correct in
// supabase/functions/send-meeting-reminder/index.ts.

/** What year/month/day/hour/minute does `instant` read as, in `timeZone`? */
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

/**
 * The inverse: what UTC instant corresponds to this wall-clock date/time in
 * `timeZone`? Standard "round-trip through Intl" technique - guess the
 * instant by treating the wall-clock values as UTC, see what that guess
 * actually reads as in the target zone, then shift by the difference. One
 * pass is enough outside the handful of minutes spanning a DST transition,
 * which a fixed evening meeting time is never going to land in.
 */
function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const asRead = readInZone(guess, timeZone);
  const asIfUtc = Date.UTC(asRead.year, asRead.month - 1, asRead.day, asRead.hour, asRead.minute);
  const offset = guess.getTime() - asIfUtc;
  return new Date(guess.getTime() + offset);
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The calendar-date key (in `timeZone`) an already-materialized event's
 * UTC `starts_at` falls on - used to match it against a freshly computed
 * occurrence regardless of which viewer's browser did the computing.
 */
export function dateKeyInZone(instant: Date, timeZone: string): string {
  const { year, month, day } = readInZone(instant, timeZone);
  return dateKey(year, month, day);
}

/** All occurrence dates in a given month matching the config's weekday + Nth-in-month indices. */
export function getOccurrencesInMonth(
  year: number,
  month: number,
  config: RecurrenceConfig
): Date[] {
  const occurrences: Date[] = [];
  // A calendar date's weekday is a pure calendar fact, independent of
  // timezone - noon UTC keeps it well clear of any date-line edge case.
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  let matchIndex = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(Date.UTC(year, month, day, 12)).getUTCDay();
    if (dayOfWeek === config.dayOfWeek) {
      matchIndex++;
      if (config.occurrencesInMonth.includes(matchIndex)) {
        const [hours, minutes] = config.timeOfDay.split(":").map(Number);
        occurrences.push(zonedTimeToUtc(year, month + 1, day, hours, minutes, config.timezone));
      }
    }
  }

  return occurrences;
}

export function getUpcomingOccurrences(
  config: RecurrenceConfig,
  count: number,
  from: Date = new Date(),
  skipDates: Set<string> = new Set()
): Date[] {
  const results: Date[] = [];
  // Anchor the month/day search to the group's own current calendar date,
  // not the viewer's - matters right around midnight in either direction
  // near a month boundary.
  const nowInZone = readInZone(from, config.timezone);
  let year = nowInZone.year;
  let month = nowInZone.month - 1;

  while (results.length < count) {
    const monthOccurrences = getOccurrencesInMonth(year, month, config);
    for (const occurrence of monthOccurrences) {
      if (occurrence.getTime() >= from.getTime() && !skipDates.has(dateKeyInZone(occurrence, config.timezone))) {
        results.push(occurrence);
      }
    }
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return results.slice(0, count);
}

export function getNextOccurrence(
  config: RecurrenceConfig,
  from: Date = new Date(),
  skipDates: Set<string> = new Set()
): Date {
  return getUpcomingOccurrences(config, 1, from, skipDates)[0];
}
