"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Question, X, type Icon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

const OPTIONS: { status: RsvpStatus; label: string; icon: Icon; selectedClass: string }[] = [
  { status: "yes", label: "Yes", icon: Check, selectedClass: "border-teal bg-teal text-white shadow-sm shadow-teal/30" },
  { status: "maybe", label: "Maybe", icon: Question, selectedClass: "border-sand bg-sand text-white shadow-sm shadow-sand/30" },
  { status: "no", label: "No", icon: X, selectedClass: "border-accent bg-accent text-white shadow-sm shadow-accent/30" },
];

// "Yes"/"No" get a spring pop (button overshoots, icon bounces in with a
// little rotate); "Maybe" gets a squash-and-stretch jelly wiggle instead -
// picked over three other options (ripple, fill sweep, particle burst) via
// a live side-by-side preview.
const POP_STATUSES: RsvpStatus[] = ["yes", "no"];
const POP_TRANSITION = { duration: 0.42, ease: [0.34, 1.56, 0.64, 1] as const };
const JELLY_TRANSITION = { duration: 0.5, ease: [0.36, 0.07, 0.19, 0.97] as const };

const POP_BUTTON_KEYFRAMES = { scale: [1, 1.22, 1] };
const POP_ICON_KEYFRAMES = { scale: [0.3, 1.3, 1], rotate: [-20, 6, 0], opacity: [0, 1, 1] };
const JELLY_KEYFRAMES = {
  scaleX: [1, 1.25, 0.86, 1.1, 0.96, 1],
  scaleY: [1, 0.78, 1.16, 0.92, 1.04, 1],
};

export function RSVPButtons({
  eventId,
  userId,
  currentStatus,
  onChanged,
}: {
  eventId: string;
  userId: string;
  currentStatus: RsvpStatus | null;
  onChanged: () => void;
}) {
  const [submitting, setSubmitting] = useState<RsvpStatus | null>(null);

  // Plays the pop/jelly flourish only on a genuine "just picked this"
  // transition - not on mount (so opening Calendar to an existing RSVP
  // doesn't animate) and not while the same status stays selected across
  // re-renders.
  const [justSelected, setJustSelected] = useState<RsvpStatus | null>(null);
  const prevStatus = useRef(currentStatus);
  useEffect(() => {
    if (currentStatus && currentStatus !== prevStatus.current) {
      setJustSelected(currentStatus);
      const duration = currentStatus === "maybe" ? 500 : 420;
      const timer = setTimeout(() => setJustSelected(null), duration);
      prevStatus.current = currentStatus;
      return () => clearTimeout(timer);
    }
    prevStatus.current = currentStatus;
  }, [currentStatus]);

  async function handleSelect(status: RsvpStatus) {
    setSubmitting(status);
    const supabase = createClient();
    if (currentStatus === status) {
      await supabase.from("rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
    } else {
      await supabase
        .from("rsvps")
        .upsert(
          { event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() },
          { onConflict: "event_id,user_id" }
        );
      trackEvent('event_rsvp', { status })
    }
    setSubmitting(null);
    onChanged();
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map(({ status, label, icon: StatusIcon, selectedClass }) => {
        const isPop = POP_STATUSES.includes(status);
        const active = justSelected === status;
        return (
          <motion.button
            key={status}
            whileTap={{ scale: 0.95 }}
            animate={active ? (isPop ? POP_BUTTON_KEYFRAMES : JELLY_KEYFRAMES) : undefined}
            transition={isPop ? POP_TRANSITION : JELLY_TRANSITION}
            onClick={() => handleSelect(status)}
            disabled={submitting !== null}
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors disabled:opacity-60",
              currentStatus === status ? selectedClass : "border-border bg-white text-secondary hover:bg-surface-muted"
            )}
          >
            {isPop ? (
              <motion.span
                className="flex items-center"
                animate={active ? POP_ICON_KEYFRAMES : undefined}
                transition={POP_TRANSITION}
              >
                <StatusIcon size={14} weight={currentStatus === status ? "bold" : "regular"} />
              </motion.span>
            ) : (
              <StatusIcon size={14} weight={currentStatus === status ? "bold" : "regular"} />
            )}
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}
