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

  // The bucket is private now (see 0038_chat_photos_private.sql), so a
  // public URL would just 403 - store the bare path instead and resolve it
  // to a short-lived signed URL at render time (see resolveChatPhotoUrls.ts).
  return path;
}
