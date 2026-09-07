// This app has a small allowlist of designated admin accounts (not a
// general role system) allowed to manage the recurring meeting schedule and
// edit/close/delete polls and potluck items they didn't create - see
// migration 0040_admin_only_schedule_actions.sql (original) and
// 0042_second_admin.sql (the shared public.is_admin_email() function the
// database side actually enforces against). This constant only mirrors
// that same check on the UI side, so a non-admin never sees a button that
// would fail server-side anyway - keep it in sync with is_admin_email().
//
// Not the same thing as lib/superadmin/: this is a *group-scoped* trusted
// member (any group can have one), checked all over the regular app UI.
// lib/superadmin/ is a single hidden, platform-wide operator console for
// managing every group at once - unrelated allowlist, unrelated person,
// unrelated pages. They used to both be named "admin", which made it easy
// to import the wrong one; if you're looking for the other one, it's
// isSuperadminEmail() in lib/superadmin/superadminEmails.ts.
export const ADMIN_EMAILS = ["vqtran15@gmail.com", "vqtran15+1@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

// Calendar-only widening of the above: per explicit request, recurring
// meeting management (create/edit/delete the schedule, edit a series, skip
// a meeting, override a recurring occurrence's location) is no longer
// restricted to just the ADMIN_EMAILS allowlist - whoever created the group
// gets those same rights over their own group's calendar, without being
// added to that allowlist. Mirrored server-side by
// public.is_calendar_admin(group_id) (see
// 0054_calendar_admin_includes_group_creator.sql), which is the actual
// enforcement; this is only the UI-side mirror. Scoped to Calendar only -
// polls/potluck/resources moderation still follows isAdminEmail() alone.
export function isCalendarAdmin(
  email: string | null | undefined,
  userId: string | null | undefined,
  groupCreatedBy: string | null | undefined
): boolean {
  return isAdminEmail(email) || (!!userId && userId === groupCreatedBy);
}
