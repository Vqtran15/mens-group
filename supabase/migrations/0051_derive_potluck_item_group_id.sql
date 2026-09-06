-- InlinePotluckCard (chat) only has the potluck_id on hand when adding an
-- item, not the group_id potluck_items.group_id still requires - and
-- deriving it here rather than threading it through every insert site
-- closes a real gap in 0049's insert policy: that policy checks the
-- *potluck's* group_id matches the caller, but never checked that the new
-- row's own group_id column actually matched that same potluck, so a
-- direct API call could previously declare a mismatched group_id on an
-- otherwise-valid insert. Forcing it here, unconditionally, from the
-- potluck being inserted into makes group_id a derived value instead of
-- caller-supplied, for every insert site present and future.
create or replace function public.derive_potluck_item_group_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select group_id into new.group_id from public.potlucks where id = new.potluck_id;
  return new;
end;
$$;

create trigger derive_potluck_item_group_id
  before insert on public.potluck_items
  for each row
  execute function public.derive_potluck_item_group_id();
