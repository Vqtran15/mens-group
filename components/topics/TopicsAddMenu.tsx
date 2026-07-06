"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChatText, NotePencil, Notebook, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export function TopicsAddMenu() {
  const [open, setOpen] = useState(false);
  const [draftCount, setDraftCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("topic_drafts")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setDraftCount(count ?? 0));
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add topic or draft"
        whileTap={{ scale: 0.85 }}
        transition={{ duration: 0.15 }}
        className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted hover:text-primary"
      >
        <Plus size={22} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-white p-1.5 shadow-xl"
          >
            <Link
              href="/topics/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
            >
              <ChatText size={18} /> New Topic
            </Link>
            <Link
              href="/topics/drafts/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
            >
              <NotePencil size={18} /> New Draft
            </Link>
            <div className="my-1 border-t border-border/60" />
            <Link
              href="/topics/drafts"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
            >
              <Notebook size={18} />
              Drafts{draftCount > 0 ? ` (${draftCount})` : ""}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
