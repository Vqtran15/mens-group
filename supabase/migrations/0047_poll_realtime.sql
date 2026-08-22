-- The new inline poll-voting card in chat (components/chat/InlinePollCard.tsx)
-- subscribes to postgres_changes on poll_votes/poll_options/polls, but
-- postgres_changes only ever fires for tables actually added to the
-- supabase_realtime publication - chat_messages (0005) and topics (0015)
-- already got this, these three never did since nothing needed them live
-- before now.
alter publication supabase_realtime add table public.poll_votes;
alter publication supabase_realtime add table public.poll_options;
alter publication supabase_realtime add table public.polls;
