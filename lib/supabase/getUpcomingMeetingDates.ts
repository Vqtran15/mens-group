import type { SupabaseClient } from "@supabase/supabase-js";
import { toDateOnlyString } from "@/lib/utils";

// Returns the distinct dates (deduped, ascending) of the group's upcoming
// calendar events - used to let a topic be tied to a specific meeting date
// instead of any arbitrary date.
export async function getUpcomingMeetingDates(
  supabase: SupabaseClient,
  groupId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("events")
    .select("starts_at")
    .eq("group_id", groupId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(20);

  const dates = (data ?? []).map((row) => toDateOnlyString(new Date(row.starts_at)));
  return Array.from(new Set(dates));
}
