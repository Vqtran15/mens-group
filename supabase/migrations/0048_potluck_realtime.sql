-- Same gap as 0047_poll_realtime.sql, this time for the new inline potluck
-- card in chat (components/chat/InlinePotluckCard.tsx): postgres_changes
-- only fires for tables actually in the supabase_realtime publication, and
-- potluck_items was never added.
alter publication supabase_realtime add table public.potluck_items;
