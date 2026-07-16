"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, Trash, WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { Button } from "@/components/ui/Button";

const fieldClass =
  "w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function PollForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError("Add at least 2 options.");
      return;
    }

    setStatus("submitting");
    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) {
      setError("You must be signed in and belong to a group.");
      setStatus("idle");
      return;
    }

    const { data: poll, error: pollError } = await supabase
      .from("polls")
      .insert({ question, created_by: membership.userId, group_id: membership.groupId })
      .select()
      .single();

    if (pollError || !poll) {
      setError(pollError?.message ?? "Couldn't create the poll.");
      setStatus("idle");
      return;
    }

    const { error: optionsError } = await supabase.from("poll_options").insert(
      cleanOptions.map((option_text) => ({
        poll_id: poll.id,
        option_text,
        created_by: membership.userId,
      }))
    );

    if (optionsError) {
      setError(optionsError.message);
      setStatus("idle");
      return;
    }

    setStatus("success");
    setTimeout(() => {
      router.push(`/tools/polls/${poll.id}`);
      router.refresh();
    }, 400);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        <label htmlFor="question" className="mb-1.5 block text-sm font-medium text-secondary">
          Question
        </label>
        <input
          id="question"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What time works best?"
          className={fieldClass}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.06, ease: "easeOut" }}
        className="space-y-2"
      >
        <p className="text-sm font-medium text-secondary">Options</p>
        {options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              required
              value={option}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className={fieldClass}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                aria-label={`Remove option ${i + 1}`}
                className="shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <Trash size={16} />
              </button>
            )}
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addOption} className="w-full">
          <Plus size={16} /> Add option
        </Button>
      </motion.div>

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.12, ease: "easeOut" }}
      >
        <SuccessButton status={status} idleLabel="Create poll" submittingLabel="Creating..." className="w-full" />
      </motion.div>
    </form>
  );
}
