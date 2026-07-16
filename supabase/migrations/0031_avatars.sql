alter table public.profiles
  add column avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Public can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Path convention is <user_id>/avatar.<ext> - re-uploading a new photo
-- overwrites (upsert) the same path rather than accumulating old ones, so
-- update/delete need the same own-folder check as insert.
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can replace own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
