create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  invite_code text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.profiles add column group_id uuid references public.groups(id);

-- Added here (ahead of the rest of the group-scoping migration) because
-- create_group() below needs to seed a schedule row for the new group.
alter table public.meeting_schedule add column group_id uuid references public.groups(id);

alter table public.groups enable row level security;

create policy "Members can view own group"
  on public.groups for select
  to authenticated
  using (id = (select group_id from public.profiles where id = auth.uid()));

-- Anon-safe RPCs: sign-up happens before a session exists, so the client needs
-- to list/create/validate groups as the `anon` role without ever exposing
-- stored invite codes through a direct table grant.

create or replace function public.list_groups()
returns table (id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select id, name from public.groups order by name;
$$;

grant execute on function public.list_groups() to anon, authenticated;

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
  values (p_name || ' Meeting', 4, '{1,3}', '19:00', v_group_id);

  return v_group_id;
end;
$$;

grant execute on function public.create_group(text, text) to anon, authenticated;

create or replace function public.verify_group_invite(p_group_id uuid, p_invite_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups where id = p_group_id and invite_code = p_invite_code
  );
$$;

grant execute on function public.verify_group_invite(uuid, text) to anon, authenticated;

-- The real security boundary: re-validate group_id + invite_code independently
-- of the client, so a tampered signUp() call can't join a group without its code.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_group_id uuid := (new.raw_user_meta_data->>'group_id')::uuid;
  v_invite_code text := new.raw_user_meta_data->>'invite_code';
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );

  if v_group_id is not null then
    if not exists (
      select 1 from public.groups where id = v_group_id and invite_code = v_invite_code
    ) then
      raise exception 'Invalid group or invite code';
    end if;

    update public.profiles set group_id = v_group_id where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
