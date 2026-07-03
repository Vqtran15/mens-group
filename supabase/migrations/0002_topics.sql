create table public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.topics enable row level security;

create policy "Authenticated users can view topics"
  on public.topics for select to authenticated using (true);

create policy "Authenticated users can create topics"
  on public.topics for insert to authenticated with check (auth.uid() = created_by);

create policy "Authenticated users can update topics"
  on public.topics for update to authenticated using (true);

create table public.topic_notes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  body text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index topic_notes_topic_id_idx on public.topic_notes(topic_id, created_at);

alter table public.topic_notes enable row level security;

create policy "Authenticated users can view notes"
  on public.topic_notes for select to authenticated using (true);

create policy "Authenticated users can create notes"
  on public.topic_notes for insert to authenticated with check (auth.uid() = created_by);
