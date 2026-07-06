-- Lets an already-authenticated user with no group (e.g. after their group
-- was deleted) create or join one, without going through signUp() again -
-- create_group()/handle_new_user() both assume a pre-session signup context.
-- Same trust model as those: re-validate everything server-side rather than
-- trusting the client, and only ever touch the caller's own profile row.

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
  values (p_name || ' Meeting', 4, '{1,3}', '19:00', v_group_id);

  update public.profiles set group_id = v_group_id where id = auth.uid();

  return v_group_id;
end;
$$;

grant execute on function public.create_group_for_self(text, text) to authenticated;

create or replace function public.join_group_for_self(p_group_id uuid, p_invite_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.groups where id = p_group_id and invite_code = p_invite_code
  ) then
    raise exception 'Invalid group or invite code';
  end if;

  update public.profiles set group_id = p_group_id where id = auth.uid();

  return true;
end;
$$;

grant execute on function public.join_group_for_self(uuid, text) to authenticated;
