import type { SupabaseClient } from "@supabase/supabase-js";

// Fixed path per user (not a fresh UUID like chat photos) - a new avatar
// should replace the old one, not accumulate orphaned files in the bucket.
// A cache-busting query param is appended to the returned URL so browsers/
// next/image don't keep serving the previous photo from cache after a
// re-upload to the same path.
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  blob: Blob
): Promise<string> {
  const path = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
