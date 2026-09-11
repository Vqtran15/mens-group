"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { Check, ChartBar, LockSimple } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type OptionWithVotes = {
  id: string;
  option_text: string;
  poll_votes: { id: string; user_id: string }[];
};

type PollRow = {
  id: string;
  question: string;
  closed: boolean;
  archived_at: string | null;
};

// Renders a live-voting widget in place of the usual "tap to open" shared
// card, just for polls - lets a member vote right from the chat thread
// instead of needing to leave it, and stays in sync across everyone viewing
// it via a realtime subscription scoped to this one poll.
export function InlinePollCard({ pollId, currentUserId }: { pollId: string; currentUserId: string }) {
  // If the same poll gets shared to chat more than once, each share resolves
  // to the same pollId - if the channel topic were keyed on that alone, the
  // second card's .on() would land on a channel the first card already
  // .subscribe()'d (Supabase's client reuses channel objects by topic
  // name), which throws and crashes the whole page. The instance-unique
  // suffix keeps every card's channel independent.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [poll, setPoll] = useState<PollRow | null | undefined>(undefined);
  const [options, setOptions] = useState<OptionWithVotes[]>([]);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: pollData }, { data: optionsData }] = await Promise.all([
      supabase.from("polls").select("id, question, closed, archived_at").eq("id", pollId).maybeSingle(),
      supabase
        .from("poll_options")
        .select("id, option_text, poll_votes(id, user_id)")
        .eq("poll_id", pollId)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
    ]);
    setPoll(pollData ?? null);
    setOptions((optionsData as OptionWithVotes[] | null) ?? []);
  }, [pollId]);

  useEffect(() => {
    function init() {
      load();
    }
    init();
    const supabase = createClient();
    const channel = supabase
      .channel(`inline_poll_${pollId}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${pollId}` },
        load
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_options", filter: `poll_id=eq.${pollId}` },
        load
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "polls", filter: `id=eq.${pollId}` },
        load
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, load, instanceId]);

  const totalVotes = options.reduce((sum, o) => sum + o.poll_votes.length, 0);
  const myVoteOptionId = options.find((o) => o.poll_votes.some((v) => v.user_id === currentUserId))?.id ?? null;
  const votingClosed = !poll || poll.closed || poll.archived_at !== null;

  async function handleVote(option: OptionWithVotes) {
    if (votingClosed) return;
    const supabase = createClient();
    if (myVoteOptionId === option.id) {
      await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", currentUserId);
    } else if (myVoteOptionId) {
      await supabase.from("poll_votes").update({ option_id: option.id }).eq("poll_id", pollId).eq("user_id", currentUserId);
    } else {
      await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: option.id, user_id: currentUserId });
    }
    load();
  }

  if (poll === undefined) {
    return <div className="h-20 w-[260px] max-w-full animate-pulse rounded-2xl bg-surface-muted" />;
  }

  if (poll === null) {
    return (
      <div className="flex w-[260px] max-w-full items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ChartBar size={18} weight="duotone" />
        </span>
        <span className="text-sm text-muted">This poll was deleted</span>
      </div>
    );
  }

  return (
    <div className="w-[260px] max-w-full space-y-2 rounded-2xl bg-white p-3 shadow-sm">
      <Link
        href={`/tools/polls/${pollId}`}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 text-sm font-medium text-primary"
      >
        <ChartBar size={16} weight="duotone" className="shrink-0" />
        <span className="min-w-0 truncate">{poll.question}</span>
      </Link>

      <div className="space-y-1.5">
        {options.map((option) => {
          const count = option.poll_votes.length;
          const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
          const isMine = option.id === myVoteOptionId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleVote(option)}
              disabled={votingClosed}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border p-2 text-left text-sm shadow-sm transition-colors disabled:cursor-default",
                isMine ? "border-primary bg-primary/5" : "border-border bg-white"
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-secondary">
                  {isMine && <Check size={13} weight="bold" className="shrink-0 text-primary" />}
                  <span className="min-w-0 truncate">{option.option_text}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {count} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="flex items-center gap-1 text-xs text-muted">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        {votingClosed && (
          <span className="flex items-center gap-0.5">
            <LockSimple size={11} /> Closed
          </span>
        )}
      </p>
    </div>
  );
}
