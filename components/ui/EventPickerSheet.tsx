"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarBlank } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

export interface PickableEvent {
  id: string;
  title: string;
  starts_at: string;
}

export function EventPickerSheet({
  open,
  events,
  onPick,
  onCancel,
}: {
  open: boolean;
  events: PickableEvent[] | null;
  onPick: (eventId: string) => void;
  onCancel: () => void;
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
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-xl"
          >
            <p className="font-semibold text-primary">Add to a calendar event</p>
            <p className="mt-1 text-sm text-secondary">Pick an upcoming event to attach this potluck to.</p>
            <div className="mt-3 space-y-2">
              {events === null && (
                <p className="py-4 text-center text-sm text-muted">Loading events...</p>
              )}
              {events !== null && events.length === 0 && (
                <p className="py-4 text-center text-sm text-muted">No upcoming events yet.</p>
              )}
              {events?.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onPick(event.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
                >
                  <CalendarBlank size={18} className="shrink-0 text-secondary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-primary">{event.title}</span>
                    <span className="block text-xs text-muted">
                      {new Date(event.starts_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <Button variant="secondary" className="mt-3 w-full" onClick={onCancel}>
              Cancel
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
