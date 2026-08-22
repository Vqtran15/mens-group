-- Archiving (0043_archive_instead_of_delete.sql) keeps deleted content
-- around indefinitely so it's recoverable by hand - this is the other half
-- of that: a daily job that permanently removes anything that's been
-- archived for more than 30 days, so the database doesn't just grow
-- forever and "restorable if I ever need it" doesn't quietly turn into
-- "restorable forever." Pure SQL, not an edge function - unlike the push
-- notification crons (send-meeting-reminder, send-chat-push), this needs
-- nothing beyond DELETE statements, so pg_cron calls it directly.
--
-- Ordering doesn't matter for correctness: cascades from a purged parent
-- (polls -> poll_options -> poll_votes, topics -> topic_notes,
-- chat_messages -> message_reactions) clean up their children automatically
-- regardless of which table's DELETE runs first, and the child tables'
-- own archived_at sweep below just becomes a no-op for anything already
-- gone via cascade - it only ever catches items archived independently of
-- their (still-active) parent, e.g. a single removed poll option.
--
-- rsvps is deliberately not part of this: a recurring RSVP's identity
-- (schedule_id, occurrence_date - see 0041_rsvp_stable_occurrence_key.sql)
-- is independent of any specific events row, including an archived one, so
-- purging an old archived event never needs to touch rsvps directly - any
-- of its RSVPs were already detached (event_id set null) the moment the
-- event was archived, not still attached to the row being purged here.
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

-- 09:00 UTC - same low-traffic window already used elsewhere in this
-- project (roughly 1-2am Pacific), off to the side of meeting-reminder's
-- own hourly tick.
select cron.schedule(
  'purge-archived-content-daily',
  '0 9 * * *',
  $$select public.purge_archived_content();$$
);
