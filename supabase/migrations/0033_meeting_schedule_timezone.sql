-- The reminder edge function and the client's own event-materialization
-- code both treated time_of_day as if it were UTC, when it's actually meant
-- to be the group's local wall-clock meeting time. Backfilled to Pacific
-- for the one existing schedule (confirmed with the user) - new schedules
-- default to it too until someone changes it via the schedule edit form.
alter table public.meeting_schedule
  add column timezone text not null default 'America/Los_Angeles';
