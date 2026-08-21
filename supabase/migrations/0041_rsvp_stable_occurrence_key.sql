-- Ties a recurring RSVP's identity to (schedule_id, occurrence_date)
-- instead of solely to whichever `events` row currently represents that
-- occurrence. Every RSVP-loss incident in this project's history has been
-- some variant of "the row representing this meeting got deleted and
-- recreated, and the RSVP was tied to the old row's id" - af91958 made
-- reconciliation update matched rows in place instead of delete+recreate
-- where possible, and bd36ec7 added an app-level refuse-to-delete check as
-- a stopgap for the cases it still couldn't match. This replaces that
-- stopgap with a structural fix: a recurring RSVP can no longer be
-- destroyed by *any* churn in the `events` table, known or not-yet-found,
-- because its true identity no longer depends on a specific row surviving.
--
-- One-off events (schedule_id null) are entirely unaffected - deleting one
-- still deletes its RSVPs outright, exactly as the "delete this event"
-- confirmation already tells the user. There's no "occurrence" for a
-- one-off event to reattach to, so cascading is still the correct
-- behavior there.

alter table public.rsvps
  add column schedule_id uuid references public.meeting_schedule(id) on delete cascade,
  add column occurrence_date date;

alter table public.rsvps alter column event_id drop not null;

-- Backfill existing recurring RSVPs' stable identity from whichever event
-- they're currently attached to.
update public.rsvps r
set schedule_id = e.schedule_id,
    occurrence_date = (e.starts_at at time zone coalesce(ms.timezone, 'America/Los_Angeles'))::date
from public.events e
left join public.meeting_schedule ms on ms.id = e.schedule_id
where r.event_id = e.id and e.schedule_id is not null;

create unique index rsvps_schedule_occurrence_user_idx
  on public.rsvps(schedule_id, occurrence_date, user_id)
  where schedule_id is not null;

-- Auto-derives the stable identity from whichever event a recurring RSVP
-- currently points to, so the app's existing insert/upsert (unchanged -
-- see RSVPButtons.tsx) never has to know about schedule_id/occurrence_date
-- directly; it just keeps writing { event_id, user_id, status } like
-- before. Only fires when event_id is actually being set to a non-null
-- value - a *detach* (event_id -> null, see the trigger below) deliberately
-- leaves schedule_id/occurrence_date exactly as they were, since surviving
-- the detach is the entire point of having them.
create or replace function public.derive_rsvp_occurrence_key()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule_id uuid;
  v_starts_at timestamptz;
  v_timezone text;
begin
  if new.event_id is null then
    return new;
  end if;

  select e.schedule_id, e.starts_at into v_schedule_id, v_starts_at
  from public.events e where e.id = new.event_id;

  if v_schedule_id is null then
    return new;
  end if;

  select timezone into v_timezone from public.meeting_schedule where id = v_schedule_id;
  new.schedule_id := v_schedule_id;
  new.occurrence_date := (v_starts_at at time zone coalesce(v_timezone, 'America/Los_Angeles'))::date;
  return new;
end;
$$;

create trigger derive_rsvp_occurrence_key
  before insert or update of event_id on public.rsvps
  for each row
  execute function public.derive_rsvp_occurrence_key();

-- Detaches (rather than cascade-deletes) a recurring event's RSVPs right
-- before the row itself is deleted, by nulling event_id first - the
-- ordinary CASCADE on rsvps_event_id_fkey then has nothing left to act on
-- for those rows, since they no longer point at the row being deleted by
-- the time the delete actually happens. One-off events (schedule_id null)
-- skip this entirely and fall straight through to the normal cascade.
create or replace function public.detach_recurring_rsvps_on_event_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.schedule_id is not null then
    update public.rsvps set event_id = null where event_id = old.id;
  end if;
  return old;
end;
$$;

create trigger detach_recurring_rsvps_on_event_delete
  before delete on public.events
  for each row
  execute function public.detach_recurring_rsvps_on_event_delete();

-- Re-attaches any RSVPs detached from a since-deleted row back onto a
-- freshly (re)materialized row for the same occurrence. Deliberately a
-- narrow SECURITY DEFINER function rather than a broader rsvps UPDATE
-- policy: "Users can update own rsvp" only allows auth.uid() = user_id,
-- and reconciliation runs under whichever member's session happens to
-- load the Calendar next - that's never going to be every affected
-- member's own session, so without this, only the triggering member's own
-- detached RSVP would ever get reattached. This function does exactly one
-- narrowly-scoped thing (move a detached RSVP onto the specific new row
-- for the exact occurrence it already belongs to) rather than opening up
-- rsvps updates generally, so there's no broader tampering surface.
create or replace function public.reattach_occurrence_rsvps(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule_id uuid;
  v_starts_at timestamptz;
  v_timezone text;
  v_occurrence_date date;
begin
  select e.schedule_id, e.starts_at into v_schedule_id, v_starts_at
  from public.events e where e.id = p_event_id;

  if v_schedule_id is null then
    return;
  end if;

  select timezone into v_timezone from public.meeting_schedule where id = v_schedule_id;
  v_occurrence_date := (v_starts_at at time zone coalesce(v_timezone, 'America/Los_Angeles'))::date;

  update public.rsvps
  set event_id = p_event_id
  where schedule_id = v_schedule_id
    and occurrence_date = v_occurrence_date
    and event_id is null;
end;
$$;

grant execute on function public.reattach_occurrence_rsvps(uuid) to authenticated;
