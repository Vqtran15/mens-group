-- Drafts are personal scratchpads for a topic idea before it's tied to a
-- specific meeting date - kept in a separate table (rather than making
-- topics.topic_date nullable) so the many places that already assume every
-- topics row has a valid date and is group-visible don't need to account
-- for a private, dateless variant.
create table public.topic_drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.topic_drafts enable row level security;

-- Drafts are private to their author, unlike topics/events/chat_messages
-- which any group member can see and manage - no group-wide visibility here
-- at all, not even read-only, since a draft is explicitly a personal
-- scratchpad rather than shared group content.
create policy "Users can manage own drafts"
  on public.topic_drafts for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
