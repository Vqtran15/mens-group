-- Needed so the bottom-nav unread indicator can detect a new topic live,
-- the same way it already does for chat_messages.
alter publication supabase_realtime add table public.topics;
