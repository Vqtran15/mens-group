"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ForkKnife, LockSimple, PaperPlaneTilt } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { shareToChat } from "@/lib/supabase/shareToChat";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { Potluck } from "@/lib/types";

interface PotluckWithItemCounts extends Potluck {
  potluck_items: { id: string; archived_at: string | null }[];
}

// The list of potluck lists for the group - one flat ongoing list per group
// used to be the whole feature; now potluck works like polls, so this
// mirrors PollsView.tsx closely (item_count here plays the role vote_count
// plays there).
export function PotluckView() {
  const router = useRouter();
  const [potlucks, setPotlucks] = useState<(Potluck & { item_count: number })[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) return;
    setUserId(membership.userId);
    setGroupId(membership.groupId);
    const { data } = await supabase
      .from("potlucks")
      .select("*, profiles(display_name, avatar_color, avatar_url), potluck_items(id, archived_at)")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    const withCounts = ((data ?? []) as unknown as PotluckWithItemCounts[]).map(({ potluck_items, ...rest }) => ({
      ...rest,
      item_count: potluck_items.filter((i) => !i.archived_at).length,
    }));
    setPotlucks(withCounts);
  }, []);

  useEffect(() => {
    function init() {
      load();
    }
    init();
  }, [load]);

  async function handleShare(potluck: Potluck & { item_count: number }) {
    if (!userId || !groupId) return;
    const supabase = createClient();
    await shareToChat(supabase, {
      groupId,
      userId,
      kind: "potluck",
      refId: potluck.id,
      title: potluck.title,
      subtitle: `${potluck.item_count} ${potluck.item_count === 1 ? "item" : "items"}${potluck.closed ? " · Closed" : ""}`,
    });
    router.push("/chat");
  }

  if (potlucks === null) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {potlucks.length === 0 && (
        <EmptyState
          icon={ForkKnife}
          title="No potlucks yet"
          subtitle="Start a list so people can add what they're bringing."
        />
      )}
      {potlucks.map((potluck, i) => (
        <motion.div
          key={potluck.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.05, ease: "easeOut" }}
        >
          <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm transition-colors hover:bg-surface-muted/40">
            <Link href={`/tools/potluck/${potluck.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-primary">{potluck.title}</p>
                {potluck.closed && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-secondary">
                    <LockSimple size={12} /> Closed
                  </span>
                )}
              </div>
              <p className={cn("mt-1.5 text-xs text-muted")}>
                {potluck.item_count} {potluck.item_count === 1 ? "item" : "items"}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <Avatar
                  name={potluck.profiles?.display_name ?? "Someone"}
                  color={potluck.profiles?.avatar_color}
                  imageUrl={potluck.profiles?.avatar_url}
                  size={18}
                />
                <span className="text-xs text-muted">
                  {potluck.profiles?.display_name ?? "Someone"} ·{" "}
                  {new Date(potluck.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </Link>
            <div className="mt-1.5 flex justify-end">
              <button
                type="button"
                onClick={() => handleShare(potluck)}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm text-secondary transition-colors hover:bg-surface-muted"
              >
                <PaperPlaneTilt size={16} /> Share to chat
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
