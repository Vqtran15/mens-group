import type { SupabaseClient } from "@supabase/supabase-js";

export interface CurrentMembership {
  userId: string;
  groupId: string;
}

export async function getCurrentMembership(
  supabase: SupabaseClient
): Promise<CurrentMembership | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("group_id")
    .eq("id", userData.user.id)
    .single();

  if (!profile?.group_id) return null;

  return { userId: userData.user.id, groupId: profile.group_id };
}
