-- Lets users set a specific date for a topic (e.g. the weekend it's about)
-- instead of always showing when the topic row was created. Existing rows
-- backfill to their original creation date, not today.
alter table public.topics add column topic_date date;
update public.topics set topic_date = created_at::date where topic_date is null;
alter table public.topics alter column topic_date set default current_date;
alter table public.topics alter column topic_date set not null;
