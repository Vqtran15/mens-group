-- Polls and potluck items were both "any group member manages everything"
-- (see 0035_tools.sql) - fine for the flat, crowd-sourced model they
-- started as, but per explicit request, actually editing a poll (closing
-- voting, deleting it, adding/removing an option, editing the question) is
-- now restricted to the poll's own creator or an admin. Voting itself
-- (poll_votes) is untouched - that's still every member's own call, same
-- as before.

drop policy "Members can update own group polls" on public.polls;
create policy "Poll creator or admin can update poll"
  on public.polls for update to authenticated
  using (
    group_id = (select group_id from public.profiles where id = auth.uid())
    and (public.is_admin_email(auth.email()) or created_by = auth.uid())
  )
  with check (
    group_id = (select group_id from public.profiles where id = auth.uid())
    and (public.is_admin_email(auth.email()) or created_by = auth.uid())
  );

-- 0035's comment on this one specifically called out "anyone can add an
-- option, write-in additions are a feature" - superseded now, per the same
-- request: adding/removing an option is an edit to the poll, so it follows
-- the poll's own creator/admin, not the option's.
drop policy "Members can create poll options in own group" on public.poll_options;
create policy "Poll creator or admin can add poll options"
  on public.poll_options for insert to authenticated
  with check (
    exists (
      select 1 from public.polls p
      where p.id = poll_options.poll_id
        and p.group_id = (select group_id from public.profiles where id = auth.uid())
        and (public.is_admin_email(auth.email()) or p.created_by = auth.uid())
    )
  );

drop policy "Members can update own group poll options" on public.poll_options;
create policy "Poll creator or admin can update poll options"
  on public.poll_options for update to authenticated
  using (
    exists (
      select 1 from public.polls p
      where p.id = poll_options.poll_id
        and p.group_id = (select group_id from public.profiles where id = auth.uid())
        and (public.is_admin_email(auth.email()) or p.created_by = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.polls p
      where p.id = poll_options.poll_id
        and p.group_id = (select group_id from public.profiles where id = auth.uid())
        and (public.is_admin_email(auth.email()) or p.created_by = auth.uid())
    )
  );

-- Potluck items don't split cleanly into "insert/update" the way polls do -
-- claiming/unclaiming (setting claimed_by) is column-level, still meant to
-- stay open to any group member (it's the personal-action equivalent of
-- voting), while renaming or removing an item is the "edit" that now needs
-- to follow the item's own creator or an admin. RLS policies alone can't
-- see which columns changed between OLD and NEW, so - same approach as
-- protect_manual_location_override() in 0040 - this is a trigger on top of
-- the existing broad group-scoped policy rather than a policy rewrite.
create or replace function public.restrict_potluck_item_edits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.item_name is not distinct from old.item_name
     and new.category is not distinct from old.category
     and new.archived_at is not distinct from old.archived_at then
    return new;
  end if;

  if public.is_admin_email(auth.email()) or auth.uid() = old.created_by then
    return new;
  end if;

  raise exception 'Only the group admin or whoever added this item can edit or remove it.';
end;
$$;

create trigger restrict_potluck_item_edits
  before update on public.potluck_items
  for each row
  execute function public.restrict_potluck_item_edits();
