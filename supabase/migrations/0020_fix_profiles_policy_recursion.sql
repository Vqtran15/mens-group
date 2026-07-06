-- 0019's new profiles SELECT policy referenced public.profiles from within a
-- policy defined ON public.profiles itself, which Postgres's RLS planner
-- rejects outright as infinite recursion (42P17) - unlike every other
-- table's "group_id = (select group_id from profiles where id = auth.uid())"
-- pattern, which is fine because those policies live on a *different* table.
-- This broke every query that joins profiles (topics list, chat, etc.) in
-- production. Fix: read the caller's own group_id through a security definer
-- function, which bypasses RLS internally and so never re-triggers the
-- policy it's being called from.
create or replace function public.current_user_group_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select group_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_user_group_id() to authenticated;

drop policy "Members can view own group profiles" on public.profiles;

create policy "Members can view own group profiles"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or group_id = public.current_user_group_id()
  );
