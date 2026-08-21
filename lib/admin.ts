// This app has a single designated admin account (not a general role
// system) allowed to manage the recurring meeting schedule - see migration
// 0040_admin_only_schedule_actions.sql for the actual enforcement (RLS
// policies on meeting_schedule, a trigger on events.location). This
// constant only mirrors that same check on the UI side, so a non-admin
// never sees a button that would fail server-side anyway.
export const ADMIN_EMAIL = "vqtran15@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
