-- Three group tools, all sharing the same "any member manages" trust model
-- already used for meeting_schedule/topics/events - nothing here is
-- restricted to whoever created it.

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  url text,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

create policy "Members can view own group resources"
  on public.resources for select to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

create policy "Members can manage own group resources"
  on public.resources for all to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

-- A single shared, ongoing list per group rather than separate named
-- potluck "events" - keeps the tool to one flat list instead of a second
-- layer of navigation; a group clears it out between occasions by deleting
-- items, the same way they'd clear a shared notes doc.
create table public.potluck_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  item_name text not null,
  category text,
  claimed_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.potluck_items enable row level security;

create policy "Members can view own group potluck items"
  on public.potluck_items for select to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

create policy "Members can manage own group potluck items"
  on public.potluck_items for all to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  question text not null,
  closed boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.polls enable row level security;

create policy "Members can view own group polls"
  on public.polls for select to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

create policy "Members can manage own group polls"
  on public.polls for all to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_text text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.poll_options enable row level security;

create policy "Members can view own group poll options"
  on public.poll_options for select to authenticated
  using (exists (
    select 1 from public.polls p
    where p.id = poll_options.poll_id
    and p.group_id = (select group_id from public.profiles where id = auth.uid())
  ));

-- Anyone can add an option to any poll in their group (crowd-sourced,
-- same flat model), not just the poll's creator - "write-in" additions
-- after the fact are a feature here, not an oversight.
create policy "Members can manage own group poll options"
  on public.poll_options for all to authenticated
  using (exists (
    select 1 from public.polls p
    where p.id = poll_options.poll_id
    and p.group_id = (select group_id from public.profiles where id = auth.uid())
  ))
  with check (exists (
    select 1 from public.polls p
    where p.id = poll_options.poll_id
    and p.group_id = (select group_id from public.profiles where id = auth.uid())
  ));

-- Votes are personal, unlike everything else here - viewing results is
-- group-wide, but a member only ever inserts/updates/deletes their own
-- vote, never anyone else's (the one place this feature set isn't "anyone
-- can edit anything").
create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

alter table public.poll_votes enable row level security;

create policy "Members can view own group poll votes"
  on public.poll_votes for select to authenticated
  using (exists (
    select 1 from public.polls p
    where p.id = poll_votes.poll_id
    and p.group_id = (select group_id from public.profiles where id = auth.uid())
  ));

create policy "Members can cast own vote"
  on public.poll_votes for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.polls p
      where p.id = poll_votes.poll_id
      and p.group_id = (select group_id from public.profiles where id = auth.uid())
    )
  );

create policy "Members can change own vote"
  on public.poll_votes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Members can retract own vote"
  on public.poll_votes for delete to authenticated
  using (auth.uid() = user_id);
