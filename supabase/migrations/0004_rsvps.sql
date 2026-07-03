create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  status text not null check (status in ('yes', 'no', 'maybe')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index rsvps_event_id_idx on public.rsvps(event_id);

alter table public.rsvps enable row level security;

create policy "Authenticated users can view rsvps"
  on public.rsvps for select to authenticated using (true);

create policy "Users can create own rsvp"
  on public.rsvps for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own rsvp"
  on public.rsvps for update to authenticated using (auth.uid() = user_id);
