import type { SupabaseClient } from "@supabase/supabase-js";
import { extractChatPhotoPath } from "@/lib/supabase/chatPhotoPath";

// Long enough that a signed URL doesn't expire mid-session, short enough to
// bound how long a leaked URL stays useful.
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

// Batches every distinct image into one createSignedUrls call rather than
// one round trip per image - a 100-message page can easily reference dozens
// of photos. Returns a map from the original stored value (whatever shape
// it was in - old public URL or new bare path) to its resolved signed URL,
// so callers never need to think about path extraction themselves.
export async function resolveChatPhotoUrls(
  supabase: SupabaseClient,
  storedValues: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(storedValues));
  if (unique.length === 0) return {};

  const paths = unique.map(extractChatPhotoPath);
  const { data, error } = await supabase.storage.from("chat-photos").createSignedUrls(paths, SIGNED_URL_EXPIRY_SECONDS);
  if (error || !data) return {};

  const resolved: Record<string, string> = {};
  data.forEach((entry, i) => {
    if (entry.signedUrl) resolved[unique[i]] = entry.signedUrl;
  });
  return resolved;
}
