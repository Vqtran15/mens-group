"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChartBar, LockSimple } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { Poll } from "@/lib/types";

interface PollWithVoteCounts extends Omit<Poll, "poll_options"> {
  poll_options: { id: string; poll_votes: { id: string }[] }[];
}

export function PollsView() {
  const [polls, setPolls] = useState<(Poll & { vote_count: number })[] | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) return;
    const { data } = await supabase
      .from("polls")
      .select("*, poll_options(id, poll_votes(id))")
      .order("created_at", { ascending: false });

    const withCounts = ((data ?? []) as unknown as PollWithVoteCounts[]).map(({ poll_options, ...rest }) => ({
      ...rest,
      vote_count: poll_options.reduce((sum, o) => sum + o.poll_votes.length, 0),
    }));
    setPolls(withCounts);
  }, []);

  useEffect(() => {
    function init() {
      load();
    }
    init();
  }, [load]);

  if (polls === null) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {polls.length === 0 && (
        <EmptyState
          icon={ChartBar}
          title="No polls yet"
          subtitle="Ask the group a question and see where everyone lands."
        />
      )}
      {polls.map((poll, i) => (
        <motion.div
          key={poll.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.05, ease: "easeOut" }}
        >
          <Link
            href={`/tools/polls/${poll.id}`}
            className="block rounded-2xl border border-border/60 bg-white p-4 shadow-sm transition-colors hover:bg-surface-muted/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-primary">{poll.question}</p>
              {poll.closed && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-secondary">
                  <LockSimple size={12} /> Closed
                </span>
              )}
            </div>
            <p className={cn("mt-1.5 text-xs text-muted")}>
              {poll.vote_count} {poll.vote_count === 1 ? "vote" : "votes"}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
