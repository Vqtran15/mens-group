-- Deleting content (calendar events/series, topics, drafts, polls/options,
-- resources, potluck items, chat messages) now archives it instead of
-- actually removing the row - archived_at gets set, the app filters
-- archived_at IS NULL everywhere it lists/reads these, and the row just
-- sits there, restorable by hand (UPDATE ... SET archived_at = null) if
-- ever needed. Deliberately NOT applied to rsvps, poll_votes, or
-- message_reactions - those are "change my own mind" toggles (un-RSVP,
-- un-vote, remove a reaction), not content a user would want back, and
-- immediately redoing the same action recreates an identical row anyway.
-- meeting_schedule already has its own non-destructive "active" flag and
-- is unaffected. Groups/accounts are out of scope entirely - those are
-- already heavily-gated, cascading, deliberately-irreversible actions,
-- categorically different from "I deleted the wrong topic."
--
-- Since nothing is actually deleted anymore, every CASCADE-linked child
-- row (topic_notes, message_reactions, poll_options, poll_votes) survives
-- untouched right along with its archived parent - no extra handling
-- needed for those.

alter table public.events add column archived_at timestamptz;
alter table public.topics add column archived_at timestamptz;
alter table public.topic_drafts add column archived_at timestamptz;
alter table public.polls add column archived_at timestamptz;
alter table public.poll_options add column archived_at timestamptz;
alter table public.resources add column archived_at timestamptz;
alter table public.potluck_items add column archived_at timestamptz;
alter table public.chat_messages add column archived_at timestamptz;

-- Recurring events specifically still need their RSVPs detached (not
-- destroyed) the moment they stop being "live" - previously that only
-- happened on an actual DELETE (see detach_recurring_rsvps_on_event_delete
-- in 0041_rsvp_stable_occurrence_key.sql); archiving now needs the exact
-- same treatment, or an archived occurrence's RSVPs would stay wrongly
-- attached to a row that no longer shows anywhere, instead of being freed
-- up to reattach to whatever row next represents that occurrence.
create or replace function public.detach_recurring_rsvps_on_event_archive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.archived_at is not null and old.archived_at is null and new.schedule_id is not null then
    update public.rsvps set event_id = null where event_id = new.id;
  end if;
  return new;
end;
$$;

create trigger detach_recurring_rsvps_on_event_archive
  before update of archived_at on public.events
  for each row
  execute function public.detach_recurring_rsvps_on_event_archive();
