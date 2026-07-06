"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, PencilSimple, Trash } from "@phosphor-icons/react";

export function DraftActionSheet({
  open,
  onClose,
  editHref,
  convertHref,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  editHref: string;
  convertHref: string;
  onDelete: () => void;
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
            <div className="space-y-1">
              <Link
                href={editHref}
                onClick={onClose}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
              >
                <PencilSimple size={18} /> Edit
              </Link>
              <Link
                href={convertHref}
                onClick={onClose}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
              >
                <ArrowRight size={18} /> Convert to Topic
              </Link>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-accent transition-colors hover:bg-accent/10"
              >
                <Trash size={18} /> Delete
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
