import type { SupabaseClient } from "@supabase/supabase-js";
import type { SharedKind } from "@/lib/types";

export async function shareToChat(
  supabase: SupabaseClient,
  params: {
    groupId: string;
    userId: string;
    kind: SharedKind;
    refId: string;
    title: string;
    subtitle?: string | null;
  }
) {
  const { error } = await supabase.from("chat_messages").insert({
    body: "",
    created_by: params.userId,
    group_id: params.groupId,
    shared_kind: params.kind,
    shared_ref_id: params.refId,
    shared_title: params.title,
    shared_subtitle: params.subtitle ?? null,
  });
  if (error) throw error;
}
