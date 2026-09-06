"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";

const fieldClass =
  "w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function PotluckForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return;

    setStatus("submitting");
    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) {
      setError("You must be signed in and belong to a group.");
      setStatus("idle");
      return;
    }

    const { data: potluck, error: potluckError } = await supabase
      .from("potlucks")
      .insert({ title: title.trim(), created_by: membership.userId, group_id: membership.groupId })
      .select()
      .single();

    if (potluckError || !potluck) {
      setError(potluckError?.message ?? "Couldn't create the potluck.");
      setStatus("idle");
      return;
    }

    setStatus("success");
    setTimeout(() => {
      router.push(`/tools/potluck/${potluck.id}`);
      router.refresh();
    }, 400);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-secondary">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. 4th of July BBQ"
          className={fieldClass}
        />
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
        transition={{ duration: 0.25, delay: 0.06, ease: "easeOut" }}
      >
        <SuccessButton status={status} idleLabel="Create potluck" submittingLabel="Creating..." className="w-full" />
      </motion.div>
    </form>
  );
}
