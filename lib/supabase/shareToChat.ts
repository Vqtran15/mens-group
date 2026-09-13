import type { SupabaseClient } from "@supabase/supabase-js";
import type { SharedKind } from "@/lib/types";

export async function shareToChat(
  supabase: SupabaseClient,
  params: {
    groupId: string;
    userId: string;
    kind: SharedKind;
    refId: string | null;
    title: string;
    subtitle?: string | null;
    // Renders as a normal caption bubble *below* the shared card (see
    // MessageBubble.tsx - message.body always follows shared_kind content,
    // same as captioning a photo). Defaults to "" (no caption) so existing
    // callers are unaffected; the Potluck share uses this to spell out that
    // signing up happens right there in the card above, since a silent
    // share otherwise reads as a static preview, not something to interact
    // with - per explicit request to make that more obvious.
    body?: string;
  }
) {
  const { error } = await supabase.from("chat_messages").insert({
    body: params.body ?? "",
    created_by: params.userId,
    group_id: params.groupId,
    shared_kind: params.kind,
    shared_ref_id: params.refId,
    shared_title: params.title,
    shared_subtitle: params.subtitle ?? null,
  });
  if (error) throw error;
}
