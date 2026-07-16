"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, LockSimple, LockSimpleOpen, Plus, Trash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { cn } from "@/lib/utils";
import type { Poll, PollOption } from "@/lib/types";

type OptionWithVotes = PollOption & { poll_votes: { id: string; user_id: string }[] };

export function PollDetailView({ pollId }: { pollId: string }) {
  const router = useRouter();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<OptionWithVotes[] | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [newOption, setNewOption] = useState("");
  const [addingOption, setAddingOption] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [questionValue, setQuestionValue] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) return;
    setUserId(membership.userId);

    const [{ data: pollData }, { data: optionsData }] = await Promise.all([
      supabase.from("polls").select("*").eq("id", pollId).single(),
      supabase
        .from("poll_options")
        .select("*, poll_votes(id, user_id)")
        .eq("poll_id", pollId)
        .order("created_at", { ascending: true }),
    ]);

    if (pollData) {
      setPoll(pollData);
      setQuestionValue(pollData.question);
    }
    setOptions(optionsData ?? []);
  }, [pollId]);

  useEffect(() => {
    function init() {
      load();
    }
    init();
  }, [load]);

  const totalVotes = options?.reduce((sum, o) => sum + o.poll_votes.length, 0) ?? 0;
  const myVoteOptionId = options?.find((o) => o.poll_votes.some((v) => v.user_id === userId))?.id ?? null;

  async function handleVote(option: OptionWithVotes) {
    if (!userId || poll?.closed) return;
    const supabase = createClient();

    if (myVoteOptionId === option.id) {
      // Tapping your current pick again retracts it - voting is meant to be
      // toggleable, not a one-way commitment.
      await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", userId);
    } else if (myVoteOptionId) {
      await supabase
        .from("poll_votes")
        .update({ option_id: option.id })
        .eq("poll_id", pollId)
        .eq("user_id", userId);
    } else {
      await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: option.id, user_id: userId });
    }
    load();
  }

  async function handleAddOption(e: React.FormEvent) {
    e.preventDefault();
    if (!newOption.trim() || !userId) return;
    setAddingOption(true);
    const supabase = createClient();
    await supabase
      .from("poll_options")
      .insert({ poll_id: pollId, option_text: newOption.trim(), created_by: userId });
    setNewOption("");
    setAddingOption(false);
    load();
  }

  async function handleRemoveOption(option: OptionWithVotes) {
    const supabase = createClient();
    await supabase.from("poll_options").delete().eq("id", option.id);
    load();
  }

  async function toggleClosed() {
    if (!poll) return;
    const supabase = createClient();
    await supabase.from("polls").update({ closed: !poll.closed }).eq("id", poll.id);
    load();
  }

  async function submitQuestionEdit() {
    const trimmed = questionValue.trim();
    setEditingQuestion(false);
    if (!poll || !trimmed || trimmed === poll.question) return;
    const supabase = createClient();
    await supabase.from("polls").update({ question: trimmed }).eq("id", poll.id);
    load();
  }

  async function handleDeletePoll() {
    const supabase = createClient();
    await supabase.from("polls").delete().eq("id", pollId);
    setConfirmDelete(false);
    router.push("/tools/polls");
    router.refresh();
  }

  if (!poll || options === null) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        {editingQuestion ? (
          <input
            autoFocus
            value={questionValue}
            onChange={(e) => setQuestionValue(e.target.value)}
            onBlur={submitQuestionEdit}
            onKeyDown={(e) => e.key === "Enter" && submitQuestionEdit()}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-lg font-semibold text-primary outline-none focus:border-primary"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingQuestion(true)}
            className="text-left text-lg font-semibold text-primary"
          >
            {poll.question}
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"} {poll.closed && "· Voting closed"}
      </p>

      <div className="space-y-2">
        {options.map((option, i) => {
          const count = option.poll_votes.length;
          const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
          const isMine = option.id === myVoteOptionId;
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.04, ease: "easeOut" }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => handleVote(option)}
                disabled={poll.closed}
                className={cn(
                  "relative flex-1 overflow-hidden rounded-xl border p-3 text-left shadow-sm transition-colors disabled:cursor-default",
                  isMine ? "border-primary bg-primary/5" : "border-border bg-white"
                )}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-secondary">
                    {isMine && <Check size={14} weight="bold" className="shrink-0 text-primary" />}
                    {option.option_text}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {count} · {pct}%
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveOption(option)}
                aria-label={`Remove option ${option.option_text}`}
                className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <Trash size={14} />
              </button>
            </motion.div>
          );
        })}
      </div>

      <form onSubmit={handleAddOption} className="flex items-center gap-2">
        <input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          placeholder="Add another option"
          className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <Button type="submit" variant="secondary" disabled={addingOption || !newOption.trim()}>
          <Plus size={16} />
        </Button>
      </form>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={toggleClosed} className="flex-1">
          {poll.closed ? <LockSimpleOpen size={16} /> : <LockSimple size={16} />}
          {poll.closed ? "Reopen voting" : "Close voting"}
        </Button>
        <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} className="flex-1">
          <Trash size={16} /> Delete poll
        </Button>
      </div>

      <ConfirmSheet
        open={confirmDelete}
        title="Delete this poll?"
        description="This removes the poll and all its votes. This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDeletePoll}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
