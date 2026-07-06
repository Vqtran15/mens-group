-- Tapping an already-selected RSVP option again now clears it (untoggle)
-- instead of just re-writing the same status - that requires a DELETE on
-- the caller's own row, which had no policy allowing it until now.
create policy "Users can delete own rsvp"
  on public.rsvps
  for delete
  using (auth.uid() = user_id);
