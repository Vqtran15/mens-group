-- Lets a single recurring occurrence be skipped (e.g. holiday week) without
-- cancelling the whole series. Calendar's materialization filters upcoming
-- occurrences against this list before generating events, and the
-- send-meeting-reminder edge function checks it before notifying.
alter table public.meeting_schedule
  add column skipped_dates date[] not null default '{}';
