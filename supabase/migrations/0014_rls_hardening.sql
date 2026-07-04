-- Security audit fix: the "own row" UPDATE policies on rsvps and
-- chat_messages only re-checked auth.uid() on WITH CHECK, not that the row
-- still belongs to the caller's own group after the update. Without this, a
-- crafted PATCH (bypassing the app's UI, e.g. via the PostgREST API directly)
-- could repoint a caller's own rsvp/chat_messages row at a different group's
-- event/chat by changing event_id/group_id, since RLS only re-validated
-- ownership (auth.uid()), not tenant scope, on the post-update row.

drop policy "Users can update own rsvp" on public.rsvps;

create policy "Users can update own rsvp"
  on public.rsvps for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.events e
      where e.id = rsvps.event_id
        and e.group_id = (select group_id from public.profiles where id = auth.uid())
    )
  );

drop policy "Members can update own messages" on public.chat_messages;

create policy "Members can update own messages"
  on public.chat_messages for update
  to authenticated
  using (auth.uid() = created_by)
  with check (
    auth.uid() = created_by
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );
