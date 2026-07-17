"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UsersThree } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { cn } from "@/lib/utils";
import type { Rsvp, RsvpStatus } from "@/lib/types";

const LABELS: Record<RsvpStatus, string> = {
  yes: "Going",
  maybe: "Maybe",
  no: "Not going",
};

// Defaults to `text-secondary`, which has good contrast on the white cards
// this renders in most places - callers on a darker/tinted background (e.g.
// NextMeetingCard's solid gold) should pass a higher-contrast override.
export function AttendeeList({
  rsvps,
  textClassName = "text-secondary",
}: {
  rsvps: Rsvp[];
  textClassName?: string;
}) {
  // Only one status's names shown at a time - tapping a second row while
  // the first is open swaps to it rather than stacking multiple popovers.
  const [openStatus, setOpenStatus] = useState<RsvpStatus | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openStatus) return;

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenStatus(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openStatus]);

  const grouped: Record<RsvpStatus, Rsvp[]> = { yes: [], maybe: [], no: [] };
  for (const rsvp of rsvps) grouped[rsvp.status].push(rsvp);

  if (rsvps.length === 0) {
    return (
      <p className={cn("flex items-center gap-1.5 text-sm", textClassName)}>
        <UsersThree size={16} className="shrink-0" />
        No RSVPs yet
      </p>
    );
  }

  return (
    <div ref={rootRef} className="space-y-2">
      {(["yes", "maybe", "no"] as const).map((status) =>
        grouped[status].length > 0 ? (
          <div key={status}>
            <button
              type="button"
              onClick={() => setOpenStatus((s) => (s === status ? null : status))}
              className="flex items-center gap-2 rounded-lg transition-opacity active:opacity-70"
            >
              <AvatarStack
                people={grouped[status].map((r) => ({
                  name: r.profiles?.display_name ?? "Someone",
                  color: r.profiles?.avatar_color,
                  imageUrl: r.profiles?.avatar_url,
                }))}
              />
              <p className={cn("text-sm", textClassName)}>
                <span className="font-medium">{LABELS[status]}</span> ({grouped[status].length})
              </p>
            </button>

            {/* Expands the document flow instead of floating on top of it -
                an absolutely-positioned popover here would visually cover
                (and intercept taps on) whichever status row comes next. */}
            <AnimatePresence initial={false}>
              {openStatus === status && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-0.5 rounded-2xl border border-border bg-white p-2 shadow-sm">
                    {grouped[status].map((r) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                        <Avatar
                          name={r.profiles?.display_name ?? "Someone"}
                          color={r.profiles?.avatar_color}
                          imageUrl={r.profiles?.avatar_url}
                          size={22}
                        />
                        <span className="truncate text-sm text-secondary">
                          {r.profiles?.display_name ?? "Someone"}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null
      )}
    </div>
  );
}
