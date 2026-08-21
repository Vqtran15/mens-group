-- Restrict recurring-meeting management (create schedule, edit series, skip
-- a meeting, delete/deactivate the series) to a single designated admin
-- account, per explicit request following repeated RSVP-loss incidents
-- traced back to schedule churn. This is not a general role system - just
-- this one account, matched by email, mirroring the same check in
-- lib/admin.ts on the app side (that's UI-only convenience; this is the
-- actual enforcement, since RLS is the only real boundary against a direct
-- API call bypassing the app UI).
drop policy "Members can manage own group schedule" on public.meeting_schedule;

create policy "Only admin can create schedule"
  on public.meeting_schedule for insert to authenticated
  with check (
    auth.email() = 'vqtran15@gmail.com'
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Only admin can update schedule"
  on public.meeting_schedule for update to authenticated
  using (
    auth.email() = 'vqtran15@gmail.com'
    and group_id = (select group_id from public.profiles where id = auth.uid())
  )
  with check (
    auth.email() = 'vqtran15@gmail.com'
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Only admin can delete schedule"
  on public.meeting_schedule for delete to authenticated
  using (
    auth.email() = 'vqtran15@gmail.com'
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

-- The "Edit location" quick action on a recurring occurrence is also
-- admin-only, but events.location is *also* written by ordinary passive
-- reconciliation (any member's session, on every Calendar load) syncing it
-- from the schedule's own location - see lib/scheduleMaterialization.ts. A
-- blanket table-level restriction on events would break that sync for every
-- non-admin member just opening the Calendar tab. So this is enforced with
-- a trigger instead of a bare RLS check: reconciliation-consistent writes
-- (new location exactly matches the linked schedule's own location) pass
-- through untouched regardless of who's session runs them; only a genuine
-- divergent override requires the admin account. One-off events
-- (schedule_id null) aren't part of this at all - their location is edited
-- through a different page and stays open to any member, same as before.
alter table public.events add column location_overridden boolean not null default false;

create or replace function public.protect_manual_location_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule_location text;
begin
  if new.location is not distinct from old.location then
    return new;
  end if;

  if new.schedule_id is null then
    return new;
  end if;

  select location into schedule_location from public.meeting_schedule where id = new.schedule_id;
  if new.location is not distinct from schedule_location then
    new.location_overridden := false;
    return new;
  end if;

  if auth.email() is distinct from 'vqtran15@gmail.com' then
    raise exception 'Only the group admin can set a custom location for this meeting.';
  end if;

  new.location_overridden := (new.location is not null and new.location <> '');
  return new;
end;
$$;

create trigger protect_manual_location_override
  before update on public.events
  for each row
  execute function public.protect_manual_location_override();
