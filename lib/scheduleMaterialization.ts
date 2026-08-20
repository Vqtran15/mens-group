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
 *
 * Even so, a "stale" row can still show up here for reasons this function
 * can't fully rule out - most notably legacy rows written before this
 * matching-by-calendar-date logic existed, which can be stored on the
 * *wrong day entirely* rather than just the wrong time on the right day (see
 * the incident this guarded against: a pre-fix timezone bug materialized a
 * group's occurrences a day off, and the very first reconciliation to touch
 * those rows after the fix shipped correctly identified them as no longer
 * matching anything - and deleted them, along with every RSVP attached).
 * Matching-by-date only protects RSVPs when the old date is already right;
 * it can't protect against the old date itself being wrong. So this is a
 * second, independent safety net: whatever the reason a row looks stale,
 * never actually delete it if anyone has RSVP'd - leave it in place
 * (it'll just look like a duplicate/orphaned occurrence rather than
 * silently erasing someone's response) and let a human notice and clean it
 * up, instead of a bug in the *reconciliation logic itself* being able to
 * cascade-delete RSVPs a fourth time.
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
    const { data: staleRsvps } = await supabase.from("rsvps").select("event_id").in("event_id", staleIds);
    const idsWithRsvps = new Set((staleRsvps ?? []).map((r) => r.event_id as string));
    const safeToDeleteIds = staleIds.filter((id) => !idsWithRsvps.has(id));
    const protectedIds = staleIds.filter((id) => idsWithRsvps.has(id));

    if (protectedIds.length > 0) {
      console.warn(
        "[reconcileScheduleEvents] Refusing to delete event(s) that still have RSVPs, even though they no longer match the current schedule pattern - leaving them in place instead:",
        protectedIds
      );
    }
    if (safeToDeleteIds.length > 0) {
      await supabase.from("events").delete().in("id", safeToDeleteIds);
      changed = true;
    }
  }

  return changed;
}
