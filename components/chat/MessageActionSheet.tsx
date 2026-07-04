"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowBendUpLeft, PencilSimple } from "@phosphor-icons/react";
import { EmojiGrid } from "@/components/chat/EmojiGrid";

export function MessageActionSheet({
  open,
  onClose,
  canEdit,
  onReply,
  onEdit,
  onReact,
}: {
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  onReply: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-border bg-white p-3 pb-[env(safe-area-inset-bottom)] shadow-xl"
          >
            <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted">React</p>
            <EmojiGrid
              onSelect={(emoji) => {
                onReact(emoji);
                onClose();
              }}
            />
            <div className="mt-1 space-y-1 border-t border-border/60 pt-2">
              <button
                type="button"
                onClick={() => {
                  onReply();
                  onClose();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
              >
                <ArrowBendUpLeft size={18} /> Reply
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
                >
                  <PencilSimple size={18} /> Edit
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
