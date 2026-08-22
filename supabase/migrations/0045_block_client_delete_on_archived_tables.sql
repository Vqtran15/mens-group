-- Closes the gap 0043_archive_instead_of_delete.sql left open: the app
-- stopped calling .delete() on these tables, but nothing stopped anyone
-- from still doing it directly via the API with the same session that
-- already had DELETE rights - RLS never actually changed. This removes
-- client-facing DELETE entirely for every table the archive system covers,
-- so hard deletion can now only happen through
-- public.purge_archived_content() (0044), which is SECURITY DEFINER and so
-- runs with its own privileges regardless of what client-facing policies
-- exist - unaffected by anything below.
--
-- events, topics, and chat_messages already had their own separate
-- per-command policies, so this just drops the DELETE one and leaves
-- INSERT/UPDATE/SELECT untouched. poll_options, polls, potluck_items,
-- resources, and topic_drafts instead had a single "for all" policy
-- covering every command with identical rules - those get split into
-- INSERT + UPDATE policies carrying over the exact same rules, with no
-- DELETE policy taking the fourth slot.

drop policy "Members can delete own group events" on public.events;
drop policy "Members can delete own group topics" on public.topics;
drop policy "Members can delete own messages" on public.chat_messages;

drop policy "Members can manage own group poll options" on public.poll_options;
create policy "Members can create poll options in own group"
  on public.poll_options for insert to authenticated
  with check (
    exists (
      select 1 from public.polls p
      where p.id = poll_options.poll_id
        and p.group_id = (select group_id from public.profiles where id = auth.uid())
    )
  );
create policy "Members can update own group poll options"
  on public.poll_options for update to authenticated
  using (
    exists (
      select 1 from public.polls p
      where p.id = poll_options.poll_id
        and p.group_id = (select group_id from public.profiles where id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.polls p
      where p.id = poll_options.poll_id
        and p.group_id = (select group_id from public.profiles where id = auth.uid())
    )
  );

drop policy "Members can manage own group polls" on public.polls;
create policy "Members can create polls in own group"
  on public.polls for insert to authenticated
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));
create policy "Members can update own group polls"
  on public.polls for update to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

drop policy "Members can manage own group potluck items" on public.potluck_items;
create policy "Members can create potluck items in own group"
  on public.potluck_items for insert to authenticated
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));
create policy "Members can update own group potluck items"
  on public.potluck_items for update to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

drop policy "Members can manage own group resources" on public.resources;
create policy "Members can create resources in own group"
  on public.resources for insert to authenticated
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));
create policy "Members can update own group resources"
  on public.resources for update to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

-- topic_drafts had no separate SELECT policy at all - the "for all" policy
-- being replaced was the only thing granting it (scoped to your own
-- drafts only, never the whole group's - drafts are private scratchpads
-- until converted into a real topic). That has to be recreated explicitly
-- here too, or dropping the all-in-one policy below would silently break
-- read access along with delete.
drop policy "Users can manage own drafts" on public.topic_drafts;
create policy "Users can view own drafts"
  on public.topic_drafts for select to authenticated
  using (created_by = auth.uid());
create policy "Users can create own drafts"
  on public.topic_drafts for insert to authenticated
  with check (created_by = auth.uid());
create policy "Users can update own drafts"
  on public.topic_drafts for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
