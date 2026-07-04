-- Add group_id to the remaining group-scoped tables (meeting_schedule already got it in 0009).
alter table public.topics add column group_id uuid references public.groups(id);
alter table public.events add column group_id uuid references public.groups(id);
alter table public.chat_messages add column group_id uuid references public.groups(id);
alter table public.push_subscriptions add column group_id uuid references public.groups(id);

-- Clean up pre-groups placeholder/test data so the NOT NULL constraints below
-- apply cleanly. None of this is real user data (see project notes).
delete from public.events where schedule_id in (select id from public.meeting_schedule where group_id is null);
delete from public.meeting_schedule where group_id is null;
delete from auth.users where email like 'vqtran15+%'; -- cascades to profiles

alter table public.topics alter column group_id set not null;
alter table public.events alter column group_id set not null;
alter table public.chat_messages alter column group_id set not null;
alter table public.meeting_schedule alter column group_id set not null;
-- push_subscriptions.group_id is intentionally left nullable at the column level;
-- app code always sets it from the caller's profile at subscribe time.

-- Rewrite every "any authenticated user" policy to scope by the caller's own group.

drop policy "Authenticated users can view schedule" on public.meeting_schedule;
drop policy "Authenticated users can manage schedule" on public.meeting_schedule;

create policy "Members can view own group schedule"
  on public.meeting_schedule for select to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

create policy "Members can manage own group schedule"
  on public.meeting_schedule for all to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()))
  with check (group_id = (select group_id from public.profiles where id = auth.uid()));

drop policy "Authenticated users can view topics" on public.topics;
drop policy "Authenticated users can create topics" on public.topics;
drop policy "Authenticated users can update topics" on public.topics;

create policy "Members can view own group topics"
  on public.topics for select to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

create policy "Members can create topics in own group"
  on public.topics for insert to authenticated
  with check (
    auth.uid() = created_by
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Members can update own group topics"
  on public.topics for update to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

drop policy "Authenticated users can view notes" on public.topic_notes;
drop policy "Authenticated users can create notes" on public.topic_notes;

create policy "Members can view own group notes"
  on public.topic_notes for select to authenticated
  using (exists (
    select 1 from public.topics t
    where t.id = topic_notes.topic_id
      and t.group_id = (select group_id from public.profiles where id = auth.uid())
  ));

create policy "Members can create notes in own group"
  on public.topic_notes for insert to authenticated
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.topics t
      where t.id = topic_notes.topic_id
        and t.group_id = (select group_id from public.profiles where id = auth.uid())
    )
  );

drop policy "Authenticated users can view events" on public.events;
drop policy "Authenticated users can create events" on public.events;
drop policy "Authenticated users can update events" on public.events;

create policy "Members can view own group events"
  on public.events for select to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

create policy "Members can create events in own group"
  on public.events for insert to authenticated
  with check (
    auth.uid() = created_by
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );

create policy "Members can update own group events"
  on public.events for update to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

drop policy "Authenticated users can view rsvps" on public.rsvps;
drop policy "Users can create own rsvp" on public.rsvps;

create policy "Members can view own group rsvps"
  on public.rsvps for select to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = rsvps.event_id
      and e.group_id = (select group_id from public.profiles where id = auth.uid())
  ));

create policy "Members can create own rsvp in own group"
  on public.rsvps for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.events e
      where e.id = rsvps.event_id
        and e.group_id = (select group_id from public.profiles where id = auth.uid())
    )
  );

drop policy "Authenticated users can view messages" on public.chat_messages;
drop policy "Authenticated users can send messages" on public.chat_messages;

create policy "Members can view own group messages"
  on public.chat_messages for select to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));

create policy "Members can send messages in own group"
  on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = created_by
    and group_id = (select group_id from public.profiles where id = auth.uid())
  );
