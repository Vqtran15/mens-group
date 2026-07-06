import type { MeetingSchedule } from "@/lib/types";
import { toDateOnlyString } from "@/lib/utils";

export interface RecurrenceConfig {
  dayOfWeek: number;
  occurrencesInMonth: number[];
  timeOfDay: string;
  durationMinutes: number;
}

export function toRecurrenceConfig(schedule: MeetingSchedule): RecurrenceConfig {
  return {
    dayOfWeek: schedule.day_of_week,
    occurrencesInMonth: schedule.occurrences_in_month,
    timeOfDay: schedule.time_of_day,
    durationMinutes: schedule.duration_minutes,
  };
}

function withTimeOfDay(date: Date, timeOfDay: string): Date {
  const [hours, minutes] = timeOfDay.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/** All occurrence dates in a given month matching the config's weekday + Nth-in-month indices. */
export function getOccurrencesInMonth(
  year: number,
  month: number,
  config: RecurrenceConfig
): Date[] {
  const occurrences: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let matchIndex = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (date.getDay() === config.dayOfWeek) {
      matchIndex++;
      if (config.occurrencesInMonth.includes(matchIndex)) {
        occurrences.push(withTimeOfDay(date, config.timeOfDay));
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
  let year = from.getFullYear();
  let month = from.getMonth();

  while (results.length < count) {
    const monthOccurrences = getOccurrencesInMonth(year, month, config);
    for (const occurrence of monthOccurrences) {
      if (occurrence.getTime() >= from.getTime() && !skipDates.has(toDateOnlyString(occurrence))) {
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
