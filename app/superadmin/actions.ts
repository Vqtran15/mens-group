"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminMember {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
  profiles: AdminMember[];
}

export async function getAdminData(): Promise<AdminGroup[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("groups")
    .select("id, name, invite_code, created_by, created_at, profiles(id, display_name, email, created_at)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminGroup[];
}

// Members with no group at all (never joined one, or removed via
// removeUserFromGroup below) - otherwise invisible from the groups list.
export async function getUnassignedUsers(): Promise<AdminMember[]> {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, created_at")
    .is("group_id", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminMember[];
}

export async function renameGroupAction(groupId: string, newName: string) {
  await requireAdmin();
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Group name can't be empty");

  const supabase = createAdminClient();
  const { error } = await supabase.from("groups").update({ name: trimmed }).eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// Cascades to the group's topics/events/chat/schedule via FK constraints
// (see migration 0021) - members aren't deleted, just lose their group_id
// and land back on /onboarding next time they open the app.
export async function deleteGroupAction(groupId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// Kicks a member out of their group without touching their account - they
// keep their login and profile, just land on /onboarding to join/create
// another group next time they open the app.
export async function removeUserFromGroupAction(userId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ group_id: null }).eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

// Full account deletion via the auth admin API - cascades to the profile
// row (on delete cascade) and from there to their authored content the
// same way self-service account deletion works (see migration 0024):
// topics/events/chat messages stay, credited to "Someone"; their own
// reactions/RSVPs are removed outright.
export async function deleteUserAccountAction(userId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
