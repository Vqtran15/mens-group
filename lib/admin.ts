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
