-- Lets a resource/potluck item/poll be shared into chat as a small card
-- instead of a plain text link. The display fields are snapshotted at
-- share time rather than joined live, so a renamed or deleted source item
-- doesn't retroactively change (or break) a message that already went out -
-- same reasoning as why reply_to_id's target can vanish but the quoted
-- preview still renders from what's on the message row itself.
-- shared_ref_id isn't a foreign key on purpose: it points into whichever of
-- three different tables shared_kind names, which a single column can't
-- constrain - RLS on those tables already governs their own access, and
-- this id is only ever used to build a link, never joined against.
alter table public.chat_messages
  add column shared_kind text check (shared_kind in ('resource', 'potluck', 'poll')),
  add column shared_ref_id uuid,
  add column shared_title text,
  add column shared_subtitle text;
