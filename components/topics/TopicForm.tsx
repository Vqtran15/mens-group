"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TopicForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setError("You must be signed in.");
      setSubmitting(false);
      return;
    }

    const { data: topic, error } = await supabase
      .from("topics")
      .insert({ title, description: description || null, created_by: data.user.id })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/topics/${topic.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-secondary">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-secondary">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:border-primary"
        />
      </div>
      {error && <p className="text-sm text-accent">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Adding..." : "Add topic"}
      </button>
    </form>
  );
}
