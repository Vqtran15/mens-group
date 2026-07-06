"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { RichTextEditor } from "@/components/topics/RichTextEditor";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { Skeleton } from "@/components/ui/Skeleton";

const fieldClass =
  "w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function DraftForm({ draftId }: { draftId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(draftId);
  const [loading, setLoading] = useState(isEditing);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (!draftId) return;
    const supabase = createClient();
    supabase
      .from("topic_drafts")
      .select("title, description")
      .eq("id", draftId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setDescription(data.description ?? "");
        }
        setLoading(false);
      });
  }, [draftId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    const supabase = createClient();

    if (draftId) {
      const { error } = await supabase
        .from("topic_drafts")
        .update({ title, description: description || null, updated_at: new Date().toISOString() })
        .eq("id", draftId);

      if (error) {
        setError(error.message);
        setStatus("idle");
        return;
      }
    } else {
      const membership = await getCurrentMembership(supabase);
      if (!membership) {
        setError("You must be signed in and belong to a group.");
        setStatus("idle");
        return;
      }

      const { error } = await supabase.from("topic_drafts").insert({
        title,
        description: description || null,
        created_by: membership.userId,
        group_id: membership.groupId,
      });

      if (error) {
        setError(error.message);
        setStatus("idle");
        return;
      }
    }

    setStatus("success");
    setTimeout(() => {
      router.push("/topics/drafts");
      router.refresh();
    }, 500);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-secondary">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={fieldClass}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.06, ease: "easeOut" }}
      >
        <label className="mb-1.5 block text-sm font-medium text-secondary">Description</label>
        <RichTextEditor value={description} onChange={setDescription} />
        <p className="mt-1.5 text-xs text-muted">
          Drafts are only visible to you. Convert to a topic when you&apos;re ready to tie it to a
          meeting.
        </p>
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
        <SuccessButton
          status={status}
          idleLabel={isEditing ? "Save changes" : "Save draft"}
          submittingLabel="Saving..."
          className="w-full"
        />
      </motion.div>
    </form>
  );
}
