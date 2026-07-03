create table public.meeting_schedule (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Men''s Group Meeting',
  day_of_week int not null check (day_of_week between 0 and 6),
  occurrences_in_month int[] not null,
  time_of_day time not null,
  duration_minutes int not null default 90,
  location text,
  notes text,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.meeting_schedule enable row level security;

create policy "Authenticated users can view schedule"
  on public.meeting_schedule for select to authenticated using (true);

create policy "Authenticated users can manage schedule"
  on public.meeting_schedule for all to authenticated using (true) with check (true);

-- Seed: 1st and 3rd Thursday, 7:00 PM
insert into public.meeting_schedule (label, day_of_week, occurrences_in_month, time_of_day, location)
values ('Men''s Group Meeting', 4, '{1,3}', '19:00', 'TBD');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid not null references public.profiles(id),
  is_recurring boolean not null default false,
  schedule_id uuid references public.meeting_schedule(id),
  created_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events(starts_at);

-- Postgres treats NULL as distinct in unique indexes, so one-off events
-- (schedule_id null) never collide with each other here; only materialized
-- occurrences of the same schedule_id + starts_at conflict, which is the
-- idempotency guarantee the upsert in the Calendar page relies on.
create unique index events_schedule_occurrence_idx
  on public.events(schedule_id, starts_at);

alter table public.events enable row level security;

create policy "Authenticated users can view events"
  on public.events for select to authenticated using (true);

create policy "Authenticated users can create events"
  on public.events for insert to authenticated with check (auth.uid() = created_by);

create policy "Authenticated users can update events"
  on public.events for update to authenticated using (true);
