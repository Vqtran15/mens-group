-- Tracks whether an account has been shown the post-signup "add to your
-- home screen" welcome screen, so it only ever appears once, right after
-- signing up, and never again on later logins - a localStorage flag would
-- be per-device instead of per-account, showing again on every new device
-- someone happens to sign into rather than staying tied to the account.
alter table public.profiles
  add column has_completed_welcome boolean not null default false;

-- Backfill: everyone who already has an account predates this feature and
-- has obviously already been using the app - only new signups going
-- forward should default to (and actually see) false.
update public.profiles set has_completed_welcome = true;
