import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadChatPhoto(
  supabase: SupabaseClient,
  groupId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${groupId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("chat-photos").upload(path, file);
  if (error) throw error;

  const { data } = supabase.storage.from("chat-photos").getPublicUrl(path);
  return data.publicUrl;
}
