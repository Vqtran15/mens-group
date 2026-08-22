import type { SupabaseClient } from "@supabase/supabase-js";
import { OCCURRENCES_TO_MATERIALIZE, dateKeyInZone, getUpcomingOccurrences, toRecurrenceConfig } from "@/lib/recurrence";
import { startOfToday } from "@/lib/utils";
import type { MeetingSchedule } from "@/lib/types";

interface ExistingEventRow {
  id: string;
  starts_at: string;
  title: string;
  location: string | null;
  location_overridden: boolean;
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
 * *wrong day entirely* rather than just the wrong time on the right day.
 * A stale row is archived (see migration 0043_archive_instead_of_delete.sql),
 * never actually deleted, and migration 0041_rsvp_stable_occurrence_key.sql
 * made archiving a recurring row detach (not destroy) its RSVPs, the same
 * way an outright delete used to. The re-attach step below is what
 * completes the loop - the moment a fresh row for that same occurrence
 * gets (re)materialized (schedule reverted, a skip got undone, whatever),
 * any RSVPs still waiting around detached get reattached to it, so the
 * churn ends up invisible to the people who RSVP'd.
 *
 * `existingEventRows` is expected to already be filtered to
 * `archived_at IS NULL` by the caller - an archived row must look
 * "not existing" to this function, both so a still-current occurrence date
 * gets a fresh (visible, unarchived) row instead of silently staying
 * archived, and so the unique (schedule_id, starts_at) index doesn't fight
 * the upsert below when that exact date needs to exist again.
 *
 * `location` is the one field this does NOT unconditionally sync from the
 * schedule: a row with `location_overridden` was explicitly given a
 * different location via the per-occurrence "Edit location" action (see
 * migration 0040), and this leaves it alone rather than stomping it back to
 * the schedule's own location on the very next reconcile - which is exactly
 * what used to happen (the override would get silently undone within the
 * same page load that saved it, since saving triggers a reload that
 * immediately re-runs this function).
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
      // Only sync from the schedule's own location when this occurrence
      // hasn't been individually overridden - an overridden row keeps
      // whatever it already has, which also makes it compare equal to
      // itself below so it doesn't trigger a spurious update on its own.
      location: existing?.location_overridden ? existing.location : schedule.location,
    };

    if (!existing) {
      toInsert.push({
        ...patch,
        created_by: currentUserId,
        is_recurring: true,
        schedule_id: schedule.id,
        group_id: groupId,
        // Explicit, not just the column default: the upsert below can also
        // land on an *archived* row sharing this exact (schedule_id,
        // starts_at) - onConflict only updates the columns present in this
        // object, so without this an archived occurrence coming back into
        // rotation would silently stay archived forever.
        archived_at: null,
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
    const { data: insertedRows } = await supabase
      .from("events")
      .upsert(toInsert, { onConflict: "schedule_id,starts_at" })
      .select("id, starts_at");
    changed = true;

    // Re-attach any RSVPs left detached by a previously-deleted row for
    // this exact occurrence (schedule_id + occurrence_date) - see
    // migration 0041_rsvp_stable_occurrence_key.sql. A SECURITY DEFINER
    // RPC, not a direct table update: reconciliation runs under whichever
    // member's session happens to load Calendar next, and the rsvps
    // UPDATE policy only allows a user to touch their own row - a direct
    // update here would silently reattach only the triggering member's
    // own RSVP and leave everyone else's stuck detached. Harmless no-op
    // when there's nothing to reattach (the common case: a genuinely
    // brand-new occurrence nobody has RSVP'd to yet).
    if (insertedRows) {
      await Promise.all(insertedRows.map((row) => supabase.rpc("reattach_occurrence_rsvps", { p_event_id: row.id })));
    }
  }
  if (toUpdate.length > 0) {
    await Promise.all(toUpdate.map(({ id, patch }) => supabase.from("events").update(patch).eq("id", id)));
    changed = true;
  }
  if (staleIds.length > 0) {
    await supabase.from("events").update({ archived_at: new Date().toISOString() }).in("id", staleIds);
    changed = true;
  }

  return changed;
}
