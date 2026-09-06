-- Same gap as 0047/0048: postgres_changes only fires for tables actually in
-- the supabase_realtime publication. potluck_items already got this
-- (0048); the new potlucks table (close/reopen, delete) needs it too so
-- the inline chat card and the detail page pick up a close/reopen or
-- delete from another client live.
alter publication supabase_realtime add table public.potlucks;
