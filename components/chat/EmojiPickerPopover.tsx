"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smiley } from "@phosphor-icons/react";
import { FullEmojiPicker } from "@/components/chat/FullEmojiPicker";

export function EmojiPickerPopover({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // A "fixed inset-0" overlay doesn't reliably cover the viewport here -
    // this composer bar's wrapper has backdrop-blur, and backdrop-filter
    // (like transform) creates a new containing block for fixed-position
    // descendants, so the overlay ends up clipped to the bar instead of the
    // full screen. Detecting outside clicks directly avoids that entirely.
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Add emoji"
        className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted"
      >
        <Smiley size={20} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 z-20 mb-2 w-80 overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
          >
            <FullEmojiPicker
              onSelect={(emoji) => {
                onSelect(emoji);
                setOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
