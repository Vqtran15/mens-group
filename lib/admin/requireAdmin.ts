import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/adminEmails";

// Re-checked in every server action, not just the /admin layout - Server
// Actions are directly callable endpoints, so a layout-only gate wouldn't
// actually stop a request that skips rendering the page.
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Not authorized");
  }

  return { id: user.id, email: user.email! };
}
