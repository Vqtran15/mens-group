"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

// A plain Yes/No confirm is fine for deleting your own stuff, but this
// panel can delete *anyone's* group or account - a stray misclick here has
// a much bigger blast radius, so it requires typing the exact name/email
// rather than just tapping a button.
export function TypedConfirmDialog({
  open,
  title,
  description,
  confirmWord,
  confirmLabel = "Delete",
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmWord: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");

  function handleCancel() {
    setTyped("");
    onCancel();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/40"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-white p-4 shadow-xl"
          >
            <p className="font-semibold text-primary">{title}</p>
            {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
            <p className="mt-3 text-sm text-secondary">
              Type <span className="font-mono font-semibold text-primary">{confirmWord}</span> to confirm:
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-mono text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleCancel} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                disabled={typed !== confirmWord || pending}
                onClick={onConfirm}
              >
                {pending ? "Working..." : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
