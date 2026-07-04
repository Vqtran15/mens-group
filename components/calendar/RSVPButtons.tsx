"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Question, X, type Icon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/lib/types";

const OPTIONS: { status: RsvpStatus; label: string; icon: Icon }[] = [
  { status: "yes", label: "Yes", icon: Check },
  { status: "maybe", label: "Maybe", icon: Question },
  { status: "no", label: "No", icon: X },
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
      {OPTIONS.map(({ status, label, icon: StatusIcon }) => (
        <motion.button
          key={status}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSelect(status)}
          disabled={submitting !== null}
          className={cn(
            "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
            currentStatus === status
              ? "border-primary bg-primary text-white shadow-sm shadow-primary/30"
              : "border-border bg-white text-secondary hover:bg-surface-muted"
          )}
        >
          <StatusIcon size={14} weight={currentStatus === status ? "bold" : "regular"} />
          {label}
        </motion.button>
      ))}
    </div>
  );
}
