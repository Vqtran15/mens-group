"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
    <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border/60 bg-white/90 p-3 backdrop-blur-sm">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Message..."
        className="flex-1 rounded-full border border-border bg-background/60 px-4 py-2 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
      />
      <motion.button
        whileTap={{ scale: 0.93 }}
        type="submit"
        disabled={!body.trim()}
        aria-label="Send message"
        className="rounded-full bg-primary p-3 text-white shadow-sm shadow-primary/30 disabled:opacity-60"
      >
        <PaperPlaneTilt size={18} />
      </motion.button>
    </form>
  );
}
