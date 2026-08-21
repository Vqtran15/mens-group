-- Generalizes the single hardcoded admin email (migration
-- 0040_admin_only_schedule_actions.sql) into a small allowlist function,
-- now that there are two admin accounts. Kept as a SQL function, not a
-- table/role system - this is still meant to be a short, rarely-changing
-- list, not general infrastructure - but centralizing it here means a
-- future admin only ever needs one update instead of hunting down every
-- policy/trigger that compared against the literal string directly.
create or replace function public.is_admin_email(p_email text)
returns boolean
language sql
stable
as $$
  select p_email in ('vqtran15@gmail.com', 'vqtran15+1@gmail.com');
$$;

drop policy "Only admin can create schedule" on public.meeting_schedule;
drop policy "Only admin can update schedule" on public.meeting_schedule;
drop policy "Only admin can delete schedule" on public.meeting_schedule;

create policy "Only admin can create schedule"
  on public.meeting_schedule for insert to authenticated
  with check (
    public.is_admin_email(auth.email())
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Only admin can update schedule"
  on public.meeting_schedule for update to authenticated
  using (
    public.is_admin_email(auth.email())
    and group_id = (select group_id from public.profiles where id = auth.uid())
  )
  with check (
    public.is_admin_email(auth.email())
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Only admin can delete schedule"
  on public.meeting_schedule for delete to authenticated
  using (
    public.is_admin_email(auth.email())
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

  if not public.is_admin_email(auth.email()) then
    raise exception 'Only the group admin can set a custom location for this meeting.';
  end if;

  new.location_overridden := (new.location is not null and new.location <> '');
  return new;
end;
$$;
