-- Widens who can manage a group's recurring meeting calendar (create/edit/
-- delete the schedule, override a recurring occurrence's location) from
-- just the ADMIN_EMAILS allowlist (is_admin_email()) to also include
-- whoever created that group - per explicit request, so a group's founder
-- doesn't need to be added to a global allowlist just to run their own
-- group's calendar. Scoped to Calendar only: polls/potluck/resources
-- moderation (is_admin_email() used directly elsewhere) is untouched.
create or replace function public.is_calendar_admin(p_group_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_admin_email(auth.email())
    or exists (
      select 1 from public.groups g
      where g.id = p_group_id and g.created_by = auth.uid()
    );
$$;

drop policy "Only admin can create schedule" on public.meeting_schedule;
drop policy "Only admin can update schedule" on public.meeting_schedule;
drop policy "Only admin can delete schedule" on public.meeting_schedule;

create policy "Calendar admin can create schedule"
  on public.meeting_schedule for insert to authenticated
  with check (
    public.is_calendar_admin(group_id)
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Calendar admin can update schedule"
  on public.meeting_schedule for update to authenticated
  using (
    public.is_calendar_admin(group_id)
    and group_id = (select group_id from public.profiles where id = auth.uid())
  )
  with check (
    public.is_calendar_admin(group_id)
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Calendar admin can delete schedule"
  on public.meeting_schedule for delete to authenticated
  using (
    public.is_calendar_admin(group_id)
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

-- Same function name/signature as before (create or replace) - the
-- existing trigger on events already points at this function by name, so
-- it doesn't need to be recreated.
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

  if not public.is_calendar_admin(new.group_id) then
    raise exception 'Only the group admin can set a custom location for this meeting.';
  end if;

  new.location_overridden := (new.location is not null and new.location <> '');
  return new;
end;
$$;
