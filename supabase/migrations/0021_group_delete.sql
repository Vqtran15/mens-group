-- Lets the group's creator delete the whole group. Content tied to the
-- group (calendar, topics, chat, the meeting schedule, push subscriptions)
-- has no meaning without it, so those cascade. Member profiles are set to
-- group_id = null instead of being deleted outright - disbanding a group
-- shouldn't delete someone's account, just remove them from it.

alter table public.events
  drop constraint events_group_id_fkey,
  add constraint events_group_id_fkey foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.topics
  drop constraint topics_group_id_fkey,
  add constraint topics_group_id_fkey foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.chat_messages
  drop constraint chat_messages_group_id_fkey,
  add constraint chat_messages_group_id_fkey foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.meeting_schedule
  drop constraint meeting_schedule_group_id_fkey,
  add constraint meeting_schedule_group_id_fkey foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.push_subscriptions
  drop constraint push_subscriptions_group_id_fkey,
  add constraint push_subscriptions_group_id_fkey foreign key (group_id) references public.groups(id) on delete cascade;

alter table public.profiles
  drop constraint profiles_group_id_fkey,
  add constraint profiles_group_id_fkey foreign key (group_id) references public.groups(id) on delete set null;

create policy "Creator can delete own group"
  on public.groups for delete to authenticated
  using (created_by = auth.uid());
