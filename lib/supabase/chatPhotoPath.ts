// Existing rows store the old-style public URL
// (".../storage/v1/object/public/chat-photos/<path>"); new uploads only
// ever produce a bare "<groupId>/<uuid>.<ext>" path. Both need to resolve to
// the same storage path for signed-URL/delete calls, so every caller goes
// through this instead of assuming one format.
export function extractChatPhotoPath(urlOrPath: string): string {
  const marker = "/chat-photos/";
  const idx = urlOrPath.indexOf(marker);
  return idx === -1 ? urlOrPath : urlOrPath.slice(idx + marker.length);
}
