"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowBendUpLeft, PencilSimple, DotsThreeOutline } from "@phosphor-icons/react";
import { FullEmojiPicker } from "@/components/chat/FullEmojiPicker";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

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
  const [showFullPicker, setShowFullPicker] = useState(false);

  function handleClose() {
    setShowFullPicker(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/30"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-border bg-white p-3 pb-[env(safe-area-inset-bottom)] shadow-xl"
          >
            <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-muted">React</p>
            {showFullPicker ? (
              <div className="overflow-hidden rounded-xl">
                <FullEmojiPicker
                  onSelect={(emoji) => {
                    onReact(emoji);
                    handleClose();
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 px-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(emoji);
                      handleClose();
                    }}
                    className="rounded-lg p-1.5 text-2xl transition-colors hover:bg-surface-muted"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowFullPicker(true)}
                  aria-label="More emoji"
                  className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface-muted"
                >
                  <DotsThreeOutline size={20} />
                </button>
              </div>
            )}
            <div className="mt-1 space-y-1 border-t border-border/60 pt-2">
              <button
                type="button"
                onClick={() => {
                  onReply();
                  handleClose();
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
                    handleClose();
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
