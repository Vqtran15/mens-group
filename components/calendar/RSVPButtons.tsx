"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RsvpStatus } from "@/lib/types";

const OPTIONS: { status: RsvpStatus; label: string }[] = [
  { status: "yes", label: "Yes" },
  { status: "maybe", label: "Maybe" },
  { status: "no", label: "No" },
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
      {OPTIONS.map(({ status, label }) => (
        <button
          key={status}
          onClick={() => handleSelect(status)}
          disabled={submitting !== null}
          className={cn(
            "rounded-full border px-3 py-1 text-sm font-medium disabled:opacity-60",
            currentStatus === status
              ? "border-primary bg-primary text-white"
              : "border-border bg-white text-secondary"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
