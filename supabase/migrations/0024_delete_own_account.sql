-- Lets any user delete their own account. Content they authored (topics,
-- events, chat messages) stays in place rather than vanishing - it just
-- shows up as authored by "Someone", the same fallback the UI already uses
-- wherever a profile join comes back empty. Their own per-user state
-- (reactions, RSVPs) is removed outright instead, since an anonymous
-- "Someone reacted" is less meaningful than an anonymous topic or message.
--
-- A group's creator can't delete their account while they still own a
-- group (delete_own_account() enforces this server-side, not just in the
-- UI) - same reasoning as not being able to leave a Slack workspace as its
-- only owner. They delete the group first.

alter table public.topics alter column created_by drop not null;
alter table public.topics
  drop constraint topics_created_by_fkey,
  add constraint topics_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.topic_notes alter column created_by drop not null;
alter table public.topic_notes
  drop constraint topic_notes_created_by_fkey,
  add constraint topic_notes_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.events alter column created_by drop not null;
alter table public.events
  drop constraint events_created_by_fkey,
  add constraint events_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.chat_messages alter column created_by drop not null;
alter table public.chat_messages
  drop constraint chat_messages_created_by_fkey,
  add constraint chat_messages_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.message_reactions
  drop constraint message_reactions_user_id_fkey,
  add constraint message_reactions_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.rsvps
  drop constraint rsvps_user_id_fkey,
  add constraint rsvps_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.meeting_schedule
  drop constraint meeting_schedule_created_by_fkey,
  add constraint meeting_schedule_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.groups where created_by = auth.uid()) then
    raise exception 'Delete your group before deleting your account';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
