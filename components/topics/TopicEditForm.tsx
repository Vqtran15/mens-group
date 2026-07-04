"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/topics/RichTextEditor";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { Skeleton } from "@/components/ui/Skeleton";

export function TopicEditForm({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("topics")
      .select("title, description")
      .eq("id", topicId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setDescription(data.description ?? "");
        }
        setLoading(false);
      });
  }, [topicId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    const supabase = createClient();
    const { error } = await supabase
      .from("topics")
      .update({ title, description: description || null })
      .eq("id", topicId);

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }

    setStatus("success");
    setTimeout(() => {
      router.push(`/topics/${topicId}`);
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
        <label className="mb-1.5 block text-sm font-medium text-secondary">Description</label>
        <RichTextEditor value={description} onChange={setDescription} />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}
      <SuccessButton status={status} idleLabel="Save changes" submittingLabel="Saving..." className="w-full" />
    </form>
  );
}
