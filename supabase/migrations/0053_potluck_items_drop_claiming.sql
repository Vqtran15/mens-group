-- Skip the "add an item, then someone else claims it" two-step. Adding an
-- item now directly means "I'm bringing this" - the adder's own identity
-- *is* the commitment, the same way voting on a poll or RSVPing to an
-- event already work. That makes claimed_by permanently equal to
-- created_by going forward, so there's nothing left for a separate column
-- to represent - every existing non-archived item already has claimed_by
-- either null or equal to created_by (verified directly against staging
-- before writing this), so dropping it loses no real attribution.
alter table public.potluck_items drop column claimed_by;

-- restrict_potluck_item_edits() (0049) had a bypass branch that let
-- claimed_by change freely (subject only to the closed check) whenever
-- item_name/category/archived_at were untouched - that was specifically
-- for claim/unclaim. With the column gone, every remaining update touches
-- item_name, category, or archived_at, all of which already required the
-- creator/admin check, so the bypass branch (and the closed check that
-- lived inside it) is now unreachable dead code. Simplifying back down to
-- a blanket creator/admin check for any update, same as the 0046 original
-- before claiming existed.
create or replace function public.restrict_potluck_item_edits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin_email(auth.email()) or auth.uid() = old.created_by then
    return new;
  end if;

  raise exception 'Only the group admin or whoever added this item can edit or remove it.';
end;
$$;
