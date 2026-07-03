"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PaperPlaneTilt } from "@phosphor-icons/react";

export function NoteComposer({
  topicId,
  onAdded,
}: {
  topicId: string;
  onAdded: () => void;
}) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSubmitting(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSubmitting(false);
      return;
    }

    await supabase
      .from("topic_notes")
      .insert({ topic_id: topicId, body: body.trim(), created_by: data.user.id });

    setBody("");
    setSubmitting(false);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a note..."
        rows={2}
        className="flex-1 rounded-lg border border-border bg-white px-3 py-2 outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={submitting || !body.trim()}
        aria-label="Add note"
        className="self-end rounded-full bg-primary p-3 text-white disabled:opacity-60"
      >
        <PaperPlaneTilt size={18} />
      </button>
    </form>
  );
}
