"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { RichTextEditor } from "@/components/topics/RichTextEditor";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { toDateOnlyString } from "@/lib/utils";

export function TopicForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topicDate, setTopicDate] = useState(() => toDateOnlyString(new Date()));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) {
      setError("You must be signed in and belong to a group.");
      setStatus("idle");
      return;
    }

    const { data: topic, error } = await supabase
      .from("topics")
      .insert({
        title,
        topic_date: topicDate,
        description: description || null,
        created_by: membership.userId,
        group_id: membership.groupId,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }

    setStatus("success");
    setTimeout(() => {
      router.push(`/topics/${topic.id}`);
      router.refresh();
    }, 500);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-secondary">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label htmlFor="topicDate" className="mb-1.5 block text-sm font-medium text-secondary">
          Date
        </label>
        <input
          id="topicDate"
          type="date"
          required
          value={topicDate}
          onChange={(e) => setTopicDate(e.target.value)}
          className="w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-secondary">Description</label>
        <RichTextEditor value={description} onChange={setDescription} />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}
      <SuccessButton status={status} idleLabel="Add topic" submittingLabel="Adding..." className="w-full" />
    </form>
  );
}
