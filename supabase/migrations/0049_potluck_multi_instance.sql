-- Potluck moves from "one flat, ongoing list per group" to multi-instance,
-- matching how polls already work: create as many potluck lists as you
-- want, each shareable to chat on its own, each with its own creator/admin
-- controls (rename, close signups, delete) and its own live-updating card
-- in chat. Per explicit request, mirrors polls closely, including adding a
-- "close signups" action alongside delete.

create table public.potlucks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  closed boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.potlucks enable row level security;

create policy "Members can view own group potlucks"
  on public.potlucks for select to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

-- Creating a new potluck list is open to anyone, same as creating a poll -
-- it's editing an *existing* one (rename, close, delete) that's
-- creator/admin-only, enforced below.
create policy "Members can create potlucks in own group"
  on public.potlucks for insert to authenticated
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

create policy "Potluck creator or admin can update potluck"
  on public.potlucks for update to authenticated
  using (
    group_id = (select group_id from public.profiles where id = auth.uid())
    and (public.is_admin_email(auth.email()) or created_by = auth.uid())
  )
  with check (
    group_id = (select group_id from public.profiles where id = auth.uid())
    and (public.is_admin_email(auth.email()) or created_by = auth.uid())
  );

-- No delete policy, same as every other archive-instead-of-delete table -
-- see 0043/0045. Hard deletion only ever happens via purge_archived_content().

-- potluck_items now belongs to a specific potluck instead of just a group.
-- Nullable at first so the backfill below can populate it before the
-- not-null constraint goes on.
alter table public.potluck_items add column potluck_id uuid references public.potlucks(id) on delete cascade;

-- One auto-created "Potluck" list per group that already has any items
-- (visible or archived) - existing items and claims keep working under the
-- new model instead of orphaning or disappearing. A group with zero
-- potluck_items gets no auto-created list; it starts clean with the new
-- "create a potluck" flow.
insert into public.potlucks (group_id, title, created_by)
select distinct pi.group_id, 'Potluck', g.created_by
from public.potluck_items pi
join public.groups g on g.id = pi.group_id;

update public.potluck_items pi
set potluck_id = p.id
from public.potlucks p
where p.group_id = pi.group_id and p.title = 'Potluck' and pi.potluck_id is null;

alter table public.potluck_items alter column potluck_id set not null;
create index potluck_items_potluck_id_idx on public.potluck_items (potluck_id);

-- Existing "potluck" chat shares point at the whole group (shared_ref_id was
-- always null - see 0036/PotluckView's old handleShareList). Point them at
-- the group's newly-created potluck instead of leaving them dangling, so
-- old shares keep rendering a live card instead of silently falling back to
-- a dead link.
update public.chat_messages cm
set shared_ref_id = p.id
from public.potlucks p
where cm.shared_kind = 'potluck'
  and cm.shared_ref_id is null
  and p.group_id = cm.group_id;

-- Adding an item is open to any group member (like voting on a poll), but
-- only into a potluck that's actually theirs to add to.
drop policy "Members can create potluck items in own group" on public.potluck_items;
create policy "Members can create potluck items in own group"
  on public.potluck_items for insert to authenticated
  with check (
    exists (
      select 1 from public.potlucks p
      where p.id = potluck_items.potluck_id
        and p.group_id = (select group_id from public.profiles where id = auth.uid())
        and p.archived_at is null
        and p.closed = false
    )
  );

-- Claiming/unclaiming and adding items stay open to every member; renaming
-- or removing an item is still creator/admin-only. New here: once a
-- potluck's signups are closed, claim/unclaim is blocked too (renaming or
-- removing an item by its creator/admin still works regardless of closed,
-- matching how closing poll voting doesn't stop the poll's own creator from
-- still editing its options). Unlike polls (where "closed" only disables
-- the vote button client-side - poll_votes has no server-side closed check
-- at all), this enforces it in the trigger, not just the UI.
create or replace function public.restrict_potluck_item_edits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed boolean;
begin
  if new.item_name is not distinct from old.item_name
     and new.category is not distinct from old.category
     and new.archived_at is not distinct from old.archived_at then
    select closed into v_closed from public.potlucks where id = new.potluck_id;
    if coalesce(v_closed, false) then
      raise exception 'Signups are closed for this potluck.';
    end if;
    return new;
  end if;

  if public.is_admin_email(auth.email()) or auth.uid() = old.created_by then
    return new;
  end if;

  raise exception 'Only the group admin or whoever added this item can edit or remove it.';
end;
$$;

-- Purge archived potlucks the same way every other archived table already
-- works (see 0044) - cascades to potluck_items automatically via the
-- on delete cascade FK added above.
create or replace function public.purge_archived_content()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  delete from public.events where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] events: %', v_count; end if;

  delete from public.topics where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] topics: %', v_count; end if;

  delete from public.topic_drafts where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] topic_drafts: %', v_count; end if;

  delete from public.polls where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] polls: %', v_count; end if;

  delete from public.poll_options where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] poll_options: %', v_count; end if;

  delete from public.potlucks where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] potlucks: %', v_count; end if;

  delete from public.resources where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] resources: %', v_count; end if;

  delete from public.potluck_items where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] potluck_items: %', v_count; end if;

  delete from public.chat_messages where archived_at is not null and archived_at < now() - interval '30 days';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise notice '[purge_archived_content] chat_messages: %', v_count; end if;
end;
$$;
