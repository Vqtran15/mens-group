"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smiley } from "@phosphor-icons/react";
import { FullEmojiPicker } from "@/components/chat/FullEmojiPicker";

export function EmojiPickerPopover({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
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
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
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
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
