-- chat-photos was a public bucket with a blanket "anyone can view" read
-- policy - fine for the upload side (already folder-restricted to the
-- uploader's own group), but it meant any chat photo's URL was fetchable by
-- anyone on the internet, unauthenticated, with no group check at all. If a
-- group_id ever leaked (a shared link, a log line, brute-forcing the UUID
-- space), every photo in that group's chat was exposed indefinitely.
-- Switching to a private bucket + signed URLs means only actual members of
-- the matching group can ever resolve a working URL, and the app now
-- generates short-lived signed URLs at render time instead of storing a
-- permanently-public one.
update storage.buckets set public = false where id = 'chat-photos';

drop policy "Public can view chat photos" on storage.objects;

create policy "Members can view own group chat photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-photos'
    and (storage.foldername(name))[1] = (select group_id from public.profiles where id = auth.uid())::text
  );

-- No delete policy existed at all before this - deleting a chat message
-- couldn't clean up its photos even if the app tried to, since RLS would
-- silently no-op the storage.remove() call. Matches the same "any group
-- member" flat-trust model already used for insert here (and for every
-- other group-scoped write in this app).
create policy "Members can delete own group chat photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-photos'
    and (storage.foldername(name))[1] = (select group_id from public.profiles where id = auth.uid())::text
  );
