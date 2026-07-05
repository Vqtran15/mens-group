"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChatText, DotsThreeVertical, MapPin, Sparkle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/utils";
import { RSVPButtons } from "@/components/calendar/RSVPButtons";
import { AttendeeList } from "@/components/calendar/AttendeeList";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EditDeleteActionSheet } from "@/components/ui/EditDeleteActionSheet";
import type { CalendarEvent, RelatedTopic, Rsvp, RsvpStatus } from "@/lib/types";

export function NextMeetingCard({
  event,
  rsvps,
  userId,
  onChanged,
  relatedTopics = [],
}: {
  event: CalendarEvent;
  rsvps: Rsvp[];
  userId: string;
  onChanged: () => void;
  relatedTopics?: RelatedTopic[];
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const currentStatus: RsvpStatus | null =
    rsvps.find((r) => r.user_id === userId)?.status ?? null;
  const startsAt = new Date(event.starts_at);

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("events").delete().eq("id", event.id);
    setConfirmOpen(false);
    onChanged();
  }

  return (
    <motion.div
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="rounded-2xl bg-primary p-4 shadow-lg shadow-primary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-highlight-light">
          <Sparkle size={14} weight="fill" /> Next meeting
        </p>
        {!event.is_recurring && (
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            aria-label="Meeting actions"
            className="shrink-0 rounded-full p-1.5 text-white transition-colors hover:bg-white/15"
          >
            <DotsThreeVertical size={18} weight="bold" />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-highlight-light text-primary shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            {startsAt.toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="text-xl font-bold leading-none">{startsAt.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold text-white">{event.title}</p>
          <p className="mt-1 text-white">{formatTime(startsAt)}</p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white">
              <MapPin size={14} className="shrink-0" />
              {event.location}
            </p>
          )}
        </div>
      </div>

      {relatedTopics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {relatedTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-white"
            >
              <ChatText size={12} /> {topic.title}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4">
        <RSVPButtons
          eventId={event.id}
          userId={userId}
          currentStatus={currentStatus}
          onChanged={onChanged}
        />
      </div>
      <div className="mt-4">
        <AttendeeList rsvps={rsvps} textClassName="text-white" />
      </div>

      <EditDeleteActionSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        editHref={`/calendar/${event.id}/edit`}
        onDelete={() => setConfirmOpen(true)}
      />
      <ConfirmSheet
        open={confirmOpen}
        title="Delete this meeting?"
        description="This can't be undone. Everyone's RSVPs for it will be removed too."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </motion.div>
  );
}
