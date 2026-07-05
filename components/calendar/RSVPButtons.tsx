"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Question, X, type Icon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/lib/types";

const OPTIONS: { status: RsvpStatus; label: string; icon: Icon; selectedClass: string }[] = [
  { status: "yes", label: "Yes", icon: Check, selectedClass: "border-teal bg-teal text-white shadow-sm shadow-teal/30" },
  { status: "maybe", label: "Maybe", icon: Question, selectedClass: "border-sand bg-sand text-white shadow-sm shadow-sand/30" },
  { status: "no", label: "No", icon: X, selectedClass: "border-accent bg-accent text-white shadow-sm shadow-accent/30" },
];

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

  async function handleSelect(status: RsvpStatus) {
    setSubmitting(status);
    const supabase = createClient();
    await supabase
      .from("rsvps")
      .upsert(
        { event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() },
        { onConflict: "event_id,user_id" }
      );
    setSubmitting(null);
    onChanged();
  }

  return (
    <div className="flex gap-2">
      {OPTIONS.map(({ status, label, icon: StatusIcon, selectedClass }) => (
        <motion.button
          key={status}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSelect(status)}
          disabled={submitting !== null}
          className={cn(
            "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors disabled:opacity-60",
            currentStatus === status ? selectedClass : "border-border bg-white text-secondary hover:bg-surface-muted"
          )}
        >
          <StatusIcon size={14} weight={currentStatus === status ? "bold" : "regular"} />
          {label}
        </motion.button>
      ))}
    </div>
  );
}
