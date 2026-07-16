// Hardcoded rather than a DB-backed role: this is a personal single-admin
// project, and a plain allowlist in server-only code is less surface area
// than adding an is_admin column + admin-bypass RLS policies for the same
// result. Add more emails here if more admins are ever needed.
const ADMIN_EMAILS = ["vuong.tran.dev@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
