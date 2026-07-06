-- groups.created_by has existed since 0009 but was never actually set by
-- anything - create_group() only inserts name/invite_code (it runs before
-- the caller has a session, so it can't stamp auth.uid() at that point
-- either), and handle_new_user() never wrote it. This was just discovered
-- because it silently broke the new "only the creator can delete their
-- group" feature (every existing group, including the real one, has
-- created_by = null). Fixed by having the client tell handle_new_user()
-- whether this signup is the one that just created the group (it already
-- knows this - it just called create_group() moments earlier in the same
-- request), same trust model as group_id/invite_code already re-validated
-- server-side in this trigger.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_group_id uuid := (new.raw_user_meta_data->>'group_id')::uuid;
  v_invite_code text := new.raw_user_meta_data->>'invite_code';
  v_is_creator boolean := (new.raw_user_meta_data->>'is_creator')::boolean;
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );

  if v_group_id is not null then
    if not exists (
      select 1 from public.groups where id = v_group_id and invite_code = v_invite_code
    ) then
      raise exception 'Invalid group or invite code';
    end if;

    update public.profiles set group_id = v_group_id where id = new.id;

    if v_is_creator then
      update public.groups set created_by = new.id where id = v_group_id and created_by is null;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Backfill the one pre-existing production group: its earliest member
-- (by profile creation time) is the account that originally created it.
update public.groups g
set created_by = (
  select p.id from public.profiles p
  where p.group_id = g.id
  order by p.created_at asc
  limit 1
)
where g.created_by is null;
