-- Lets a group member delete a one-off calendar event (the app only exposes
-- this for non-recurring events - deleting a single recurring occurrence
-- wouldn't stick, since it would just get re-materialized from the
-- meeting_schedule on the next Calendar load). rsvps.event_id already
-- cascades on delete, so no orphaned RSVP rows.
create policy "Members can delete own group events"
  on public.events for delete to authenticated
  using (group_id = (select group_id from public.profiles where id = auth.uid()));
