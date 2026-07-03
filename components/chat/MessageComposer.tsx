"use client";

import { useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";

export function MessageComposer({
  onSend,
}: {
  onSend: (body: string) => void;
}) {
  const [body, setBody] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setBody("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border bg-white p-3">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message..."
        className="flex-1 rounded-full border border-border bg-background px-4 py-2 outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={!body.trim()}
        aria-label="Send message"
        className="rounded-full bg-primary p-3 text-white disabled:opacity-60"
      >
        <PaperPlaneTilt size={18} />
      </button>
    </form>
  );
}
