-- Security audit fixes (2026-07-05):

-- 1. topics UPDATE had no "with check", so a crafted PATCH could repoint a
-- topic's group_id to a different group (same bug class 0014 fixed for
-- rsvps/chat_messages, but topics was missed).
drop policy "Members can update own group topics" on public.topics;

create policy "Members can update own group topics"
  on public.topics for update to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

-- 2. Same gap on events.
drop policy "Members can update own group events" on public.events;

create policy "Members can update own group events"
  on public.events for update to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

-- 3. profiles SELECT was never scoped to the caller's own group (0010 scoped
-- every other "any authenticated user" policy but missed this one), letting
-- any signed-in user read every user's email address project-wide. Also
-- allow seeing your own row unconditionally so a profile with a not-yet-set
-- group_id (edge case) never locks a user out of their own data.
drop policy "Authenticated users can view all profiles" on public.profiles;

create policy "Members can view own group profiles"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or group_id = (select group_id from public.profiles where id = auth.uid())
  );

-- 4. chat-photos had no server-side file-size or MIME-type enforcement -
-- the client's accept="image/*" is trivially bypassed via a direct API call.
update storage.buckets
set file_size_limit = 10485760, -- 10 MiB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
where id = 'chat-photos';
