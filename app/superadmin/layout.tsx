import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperadminEmail } from "@/lib/superadmin/superadminEmails";

// Not linked from anywhere in the app's nav - reachable only by knowing the
// URL, same as the rest of the app relies on RLS rather than obscurity.
// Non-superadmins (including signed-out visitors past the proxy's own
// sign-in redirect) are bounced to /calendar rather than shown a
// "forbidden" page, so this route doesn't announce its own existence.
export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSuperadminEmail(user.email)) {
    redirect("/calendar");
  }

  return <div className="min-h-dvh bg-background">{children}</div>;
}
