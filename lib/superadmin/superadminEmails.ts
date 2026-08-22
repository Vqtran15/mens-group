// This is the platform-wide operator console (manage every group, not just
// one) - a completely different concept from lib/admin.ts's group-level
// admin allowlist (a trusted member inside their own group). They used to
// share the name "admin" across both the file and the exported function,
// which made it easy to import the wrong one; "superadmin" is deliberately
// a different word so that mistake fails loudly instead of silently.
//
// Hardcoded rather than a DB-backed role: this is a personal single-admin
// project, and a plain allowlist in server-only code is less surface area
// than adding an is_admin column + admin-bypass RLS policies for the same
// result. Add more emails here if more superadmins are ever needed.
const SUPERADMIN_EMAILS = ["vuong.tran.dev@gmail.com"];

export function isSuperadminEmail(email: string | null | undefined): boolean {
  return !!email && SUPERADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
