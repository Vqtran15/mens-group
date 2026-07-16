-- Meeting reminders move from "once daily, the day before" (~18-33h ahead
-- depending on meeting time) to a precise ~12h-ahead window. That requires
-- checking hourly instead of once a day, so the old job is dropped and
-- replaced with one running on every hour - the edge function itself now
-- does the 12h-window math (see supabase/functions/send-meeting-reminder).
select cron.unschedule('meeting-reminder-daily');

select cron.schedule(
  'meeting-reminder-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://ycjgfmdaecufftqzfmqj.supabase.co/functions/v1/send-meeting-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljamdmbWRhZWN1ZmZ0cXpmbXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNDE0NjUsImV4cCI6MjA5ODYxNzQ2NX0.x_fTP2gyuXznuzPEtj65ttZr0OJPHcL60QuULTNNFZY'
    )
  );
  $$
);
