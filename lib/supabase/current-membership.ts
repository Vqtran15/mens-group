import type { SupabaseClient } from "@supabase/supabase-js";

export interface CurrentMembership {
  userId: string;
  groupId: string;
}

export async function getCurrentMembership(
  supabase: SupabaseClient
): Promise<CurrentMembership | null> {
  // getSession() reads the already-validated session from local storage
  // instead of round-tripping to the Auth server like getUser() does. Safe
  // here since every subsequent query is still gated by RLS re-checking the
  // real JWT server-side, regardless of what this returns client-side.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("group_id")
    .eq("id", session.user.id)
    .single();

  if (!profile?.group_id) return null;

  return { userId: session.user.id, groupId: profile.group_id };
}
