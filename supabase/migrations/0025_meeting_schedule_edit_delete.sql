-- Lets deleting a meeting_schedule row clean up its already-materialized
-- future events too - without this, deleting the schedule (which the app is
-- about to let users do) would leave orphaned events.is_recurring rows with
-- no management path, since the edit/delete UI for those events routes
-- through the schedule they belong to, and that schedule would be gone.
alter table public.events
  drop constraint events_schedule_id_fkey,
  add constraint events_schedule_id_fkey foreign key (schedule_id) references public.meeting_schedule(id) on delete cascade;
