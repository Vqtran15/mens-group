import type { SupabaseClient } from "@supabase/supabase-js";
import { OCCURRENCES_TO_MATERIALIZE, dateKeyInZone, getUpcomingOccurrences, toRecurrenceConfig } from "@/lib/recurrence";
import { startOfToday } from "@/lib/utils";
import type { MeetingSchedule } from "@/lib/types";

interface ExistingEventRow {
  id: string;
  starts_at: string;
  title: string;
  location: string | null;
}

/**
 * Reconciles a recurring schedule's materialized `events` rows against what
 * it should currently generate. Matches an already-materialized row to a
 * freshly computed occurrence by *calendar date in the schedule's own
 * timezone* - never by exact instant, and never the viewer's browser
 * timezone. A matched occurrence is always updated in place, never deleted
 * and recreated, even if the time it previously stored was wrong (e.g. from
 * a past computation bug) - only a date that's no longer part of the
 * recurrence at all (the pattern actually changed, or it was explicitly
 * skipped) is ever deleted. This is what actually protects RSVPs: a delete
 * only ever happens when the occurrence itself is genuinely gone, never as
 * a side effect of a timestamp being recomputed slightly differently.
 *
 * Shared by CalendarView (which tops this up as occurrences pass) and
 * MeetingScheduleForm (which runs it right after a schedule edit) so the
 * two never drift into different reconciliation behavior again.
 */
export async function reconcileScheduleEvents(
  supabase: SupabaseClient,
  schedule: MeetingSchedule,
  existingEventRows: ExistingEventRow[],
  currentUserId: string,
  groupId: string
): Promise<boolean> {
  const occurrences = getUpcomingOccurrences(
    toRecurrenceConfig(schedule),
    OCCURRENCES_TO_MATERIALIZE,
    startOfToday(),
    new Set(schedule.skipped_dates)
  );
  const occurrenceByDate = new Map(occurrences.map((date) => [dateKeyInZone(date, schedule.timezone), date]));
  const existingByDate = new Map(
    existingEventRows.map((row) => [dateKeyInZone(new Date(row.starts_at), schedule.timezone), row])
  );

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

  for (const [dateKey, date] of occurrenceByDate) {
    const existing = existingByDate.get(dateKey);
    const endsAt = new Date(date.getTime() + schedule.duration_minutes * 60_000);
    const patch = {
      title: schedule.label,
      starts_at: date.toISOString(),
      ends_at: endsAt.toISOString(),
      location: schedule.location,
    };

    if (!existing) {
      toInsert.push({
        ...patch,
        created_by: currentUserId,
        is_recurring: true,
        schedule_id: schedule.id,
        group_id: groupId,
      });
    } else if (
      existing.starts_at !== patch.starts_at ||
      existing.title !== patch.title ||
      existing.location !== patch.location
    ) {
      toUpdate.push({ id: existing.id, patch });
    }
  }

  const staleIds = existingEventRows
    .filter((row) => !occurrenceByDate.has(dateKeyInZone(new Date(row.starts_at), schedule.timezone)))
    .map((row) => row.id);

  let changed = false;

  if (toInsert.length > 0) {
    await supabase.from("events").upsert(toInsert, { onConflict: "schedule_id,starts_at" });
    changed = true;
  }
  if (toUpdate.length > 0) {
    await Promise.all(toUpdate.map(({ id, patch }) => supabase.from("events").update(patch).eq("id", id)));
    changed = true;
  }
  if (staleIds.length > 0) {
    await supabase.from("events").delete().in("id", staleIds);
    changed = true;
  }

  return changed;
}
