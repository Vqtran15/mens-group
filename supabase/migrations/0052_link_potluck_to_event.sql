-- Lets a potluck be attached to a calendar event, so the event card can show
-- who's bringing what right alongside the event details. A potluck can be
-- linked to at most one event at a time (the partial unique index below) -
-- attaching it to a different event moves the link rather than adding a
-- second one. on delete set null (not cascade): archiving/purging the
-- potluck should just detach it from the event, not take the event with it.
alter table public.events add column potluck_id uuid references public.potlucks(id) on delete set null;

create unique index events_potluck_id_key on public.events (potluck_id) where potluck_id is not null;

-- RLS on events ("Members can update own group events") only checks that
-- the event being updated belongs to the caller's own group - it never
-- checked that a newly-set potluck_id actually belongs to that same group.
-- A user only ever belongs to one group so this isn't reachable through the
-- app today, but it's the same latent gap 0051 closed for potluck_items.group_id,
-- so it gets the same treatment here rather than trusting the client value.
create or replace function public.validate_event_potluck_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_potluck_group uuid;
begin
  if new.potluck_id is null then
    return new;
  end if;

  select group_id into v_potluck_group from public.potlucks where id = new.potluck_id;
  if v_potluck_group is distinct from new.group_id then
    raise exception 'Potluck must belong to the same group as the event.';
  end if;

  return new;
end;
$$;

create trigger validate_event_potluck_group
  before insert or update of potluck_id on public.events
  for each row
  execute function public.validate_event_potluck_group();
