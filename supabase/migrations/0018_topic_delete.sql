-- Lets any group member delete a topic, matching the existing flat-trust
-- update policy (any member can already edit any topic in their group).
create policy "Members can delete own group topics"
  on public.topics for delete to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));
