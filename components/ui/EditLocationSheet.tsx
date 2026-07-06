"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const fieldClass =
  "w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function EditLocationSheet({
  open,
  currentLocation,
  onSave,
  onCancel,
}: {
  open: boolean;
  currentLocation: string;
  onSave: (location: string) => void;
  onCancel: () => void;
}) {
  const [location, setLocation] = useState(currentLocation);

  // Re-sync whenever the sheet is (re)opened, so a previous edit that was
  // cancelled doesn't linger the next time it's opened for the same event.
  useEffect(() => {
    function syncLocation() {
      if (open) setLocation(currentLocation);
    }
    syncLocation();
  }, [open, currentLocation]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/30"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-border bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl"
          >
            <p className="font-semibold text-primary">Location for this meeting</p>
            <p className="mt-1 text-sm text-secondary">
              Only changes this one date - the rest of the series keeps its usual location.
            </p>
            <input
              autoFocus
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Sam's place"
              className={`${fieldClass} mt-3`}
            />
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => onSave(location)}>
                Save
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
