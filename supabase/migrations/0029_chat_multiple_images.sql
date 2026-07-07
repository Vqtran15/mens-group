-- Replaces the single image_url column with an array so one message can
-- carry multiple photos. Backfills existing single-image messages into the
-- new column before dropping the old one, rather than keeping both around
-- indefinitely - every reader would otherwise need to reconcile two
-- possibly-conflicting representations of "this message's photos".
alter table public.chat_messages
  add column image_urls text[] not null default '{}';

update public.chat_messages
  set image_urls = array[image_url]
  where image_url is not null;

alter table public.chat_messages
  drop column image_url;
