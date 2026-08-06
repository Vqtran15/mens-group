create or replace function public.notify_new_reaction()
returns trigger as $$
begin
  perform net.http_post(
    url := 'https://ycjgfmdaecufftqzfmqj.supabase.co/functions/v1/send-reaction-push',
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

create trigger on_new_reaction
  after insert on public.message_reactions
  for each row execute function public.notify_new_reaction();
