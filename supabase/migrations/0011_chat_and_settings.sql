-- Chat message extensions: photo attachments, replies, edit tracking.
alter table public.chat_messages add column image_url text;
alter table public.chat_messages add column reply_to_id uuid references public.chat_messages(id);
alter table public.chat_messages add column edited_at timestamptz;

create policy "Members can update own messages"
  on public.chat_messages for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Emoji reactions.
create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index message_reactions_message_id_idx on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

create policy "Members can view own group reactions"
  on public.message_reactions for select to authenticated
  using (exists (
    select 1 from public.chat_messages m
    where m.id = message_reactions.message_id
      and m.group_id = (select group_id from public.profiles where id = auth.uid())
  ));

create policy "Members can add own reaction in own group"
  on public.message_reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.chat_messages m
      where m.id = message_reactions.message_id
        and m.group_id = (select group_id from public.profiles where id = auth.uid())
    )
  );

create policy "Members can remove own reaction"
  on public.message_reactions for delete to authenticated
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.message_reactions;

-- Storage bucket for chat photo uploads. Public read (simplest for a small
-- trusted-group app - avoids signed-URL expiry complexity); writes are
-- restricted to authenticated users uploading under their own group's folder.
insert into storage.buckets (id, name, public)
values ('chat-photos', 'chat-photos', true);

create policy "Public can view chat photos"
  on storage.objects for select
  using (bucket_id = 'chat-photos');

create policy "Members can upload photos to own group folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-photos'
    and (storage.foldername(name))[1] = (select group_id from public.profiles where id = auth.uid())::text
  );
