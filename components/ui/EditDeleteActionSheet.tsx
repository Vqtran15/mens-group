"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, PaperPlaneTilt, PencilSimple, SkipForward, Trash } from "@phosphor-icons/react";

export function EditDeleteActionSheet({
  open,
  onClose,
  editHref,
  onEdit,
  editLabel = "Edit",
  onDelete,
  onSkip,
  onEditLocation,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  // Exactly one of these two is expected: editHref for a route-based edit
  // page (events), onEdit for an in-place edit like potluck items that have
  // no route of their own.
  editHref?: string;
  onEdit?: () => void;
  editLabel?: string;
  onDelete: () => void;
  onSkip?: () => void;
  onEditLocation?: () => void;
  onShare?: () => void;
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
              {editHref ? (
                <Link
                  href={editHref}
                  onClick={onClose}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
                >
                  <PencilSimple size={18} /> {editLabel}
                </Link>
              ) : (
                onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onEdit();
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
                  >
                    <PencilSimple size={18} /> {editLabel}
                  </button>
                )
              )}
              {onEditLocation && (
                <button
                  type="button"
                  onClick={() => {
                    onEditLocation();
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
                >
                  <MapPin size={18} /> Edit location
                </button>
              )}
              {onSkip && (
                <button
                  type="button"
                  onClick={() => {
                    onSkip();
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
                >
                  <SkipForward size={18} /> Skip Meeting
                </button>
              )}
              {onShare && (
                <button
                  type="button"
                  onClick={() => {
                    onShare();
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-secondary transition-colors hover:bg-surface-muted"
                >
                  <PaperPlaneTilt size={18} /> Share to chat
                </button>
              )}
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
