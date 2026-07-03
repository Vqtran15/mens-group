create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index chat_messages_created_at_idx on public.chat_messages(created_at);

alter table public.chat_messages enable row level security;

create policy "Authenticated users can view messages"
  on public.chat_messages for select to authenticated using (true);

create policy "Authenticated users can send messages"
  on public.chat_messages for insert to authenticated with check (auth.uid() = created_by);

alter publication supabase_realtime add table public.chat_messages;
