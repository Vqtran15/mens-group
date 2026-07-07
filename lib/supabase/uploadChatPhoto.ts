import type { SupabaseClient } from "@supabase/supabase-js";
import { compressImage } from "@/lib/image/compressImage";

export async function uploadChatPhoto(
  supabase: SupabaseClient,
  groupId: string,
  file: File
): Promise<string> {
  const { blob, ext } = await compressImage(file);
  const path = `${groupId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("chat-photos")
    .upload(path, blob, { contentType: ext === "jpg" ? "image/jpeg" : file.type });
  if (error) throw error;

  const { data } = supabase.storage.from("chat-photos").getPublicUrl(path);
  return data.publicUrl;
}
