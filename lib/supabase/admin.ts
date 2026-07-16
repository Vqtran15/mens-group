import "server-only";
import { createClient } from "@supabase/supabase-js";

// Bypasses RLS entirely - every table's policies scope reads/writes to the
// caller's own group, which is exactly what the admin panel needs to see
// past. Never import this from a Client Component; the `server-only`
// import makes that a build error instead of a runtime leak.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
