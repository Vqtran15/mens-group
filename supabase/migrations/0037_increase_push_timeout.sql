-- net.http_post defaults to a 5000ms timeout, which is tight for a cold
-- Deno edge function pulling in npm:@supabase/supabase-js and npm:web-push.
-- send-meeting-reminder only runs once an hour, so it's cold almost every
-- time - pg_net logs show it timing out on every single hourly tick
-- recently. send-chat-push runs far more often (every message) so it stays
-- warmer, but is exposed to the same risk during any quiet stretch, so it
-- gets the same longer timeout for consistency.
create or replace function public.notify_new_chat_message()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://ycjgfmdaecufftqzfmqj.supabase.co/functions/v1/send-chat-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljamdmbWRhZWN1ZmZ0cXpmbXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNDE0NjUsImV4cCI6MjA5ODYxNzQ2NX0.x_fTP2gyuXznuzPEtj65ttZr0OJPHcL60QuULTNNFZY'
    ),
    body := jsonb_build_object('record', row_to_json(new)),
    timeout_milliseconds := 15000
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

select cron.schedule(
  'meeting-reminder-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://ycjgfmdaecufftqzfmqj.supabase.co/functions/v1/send-meeting-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljamdmbWRhZWN1ZmZ0cXpmbXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNDE0NjUsImV4cCI6MjA5ODYxNzQ2NX0.x_fTP2gyuXznuzPEtj65ttZr0OJPHcL60QuULTNNFZY'
    ),
    timeout_milliseconds := 15000
  );
  $$
);
