-- The default meeting schedule seeded on group creation used to reuse the
-- group's own name as the meeting label (e.g. "UXAudit_1784179313812
-- Meeting"), which reads oddly for longer/informal group names and is
-- redundant anywhere the group name is already shown alongside it. A plain
-- "Weekly Meeting" default is edited via Calendar > schedule anyway, so
-- there's no loss in dropping the auto-generated name.
create or replace function public.create_group(p_name text, p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if exists (select 1 from public.groups where name = p_name) then
    raise exception 'Group name already taken';
  end if;

  insert into public.groups (name, invite_code)
  values (p_name, p_invite_code)
  returning id into v_group_id;

  insert into public.meeting_schedule (label, day_of_week, occurrences_in_month, time_of_day, group_id)
  values ('Weekly Meeting', 4, '{1,3}', '19:00', v_group_id);

  return v_group_id;
end;
$$;

create or replace function public.create_group_for_self(p_name text, p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.groups where name = p_name) then
    raise exception 'Group name already taken';
  end if;

  insert into public.groups (name, invite_code, created_by)
  values (p_name, p_invite_code, auth.uid())
  returning id into v_group_id;

  insert into public.meeting_schedule (label, day_of_week, occurrences_in_month, time_of_day, group_id)
  values ('Weekly Meeting', 4, '{1,3}', '19:00', v_group_id);

  update public.profiles set group_id = v_group_id where id = auth.uid();

  return v_group_id;
end;
$$;
