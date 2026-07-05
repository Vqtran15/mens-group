-- Lets a group member delete their own chat message. message_reactions
-- already cascades on delete (on delete cascade fk), so no orphaned
-- reaction rows. reply_to_id had no ON DELETE action, which would block
-- deleting a message that another message replied to - switch it to
-- ON DELETE SET NULL so the reply just loses its quoted preview instead
-- (MessageBubble already renders nothing when the target can't be found).
alter table public.chat_messages
  drop constraint chat_messages_reply_to_id_fkey;

alter table public.chat_messages
  add constraint chat_messages_reply_to_id_fkey
  foreign key (reply_to_id) references public.chat_messages(id) on delete set null;

create policy "Members can delete own messages"
  on public.chat_messages for delete to authenticated
  using (auth.uid() = created_by);
