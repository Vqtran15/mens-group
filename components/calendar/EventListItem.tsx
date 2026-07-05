"use client";

import { useState } from "react";
import Link from "next/link";
import { ChatText, DotsThreeVertical, MapPin } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { formatTime } from "@/lib/utils";
import { RSVPButtons } from "@/components/calendar/RSVPButtons";
import { AttendeeList } from "@/components/calendar/AttendeeList";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { EventActionSheet } from "@/components/calendar/EventActionSheet";
import type { CalendarEvent, RelatedTopic, Rsvp, RsvpStatus } from "@/lib/types";

export function EventListItem({
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
    <div className="flex gap-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-teal/10 text-teal shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {startsAt.toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-xl font-bold leading-none">{startsAt.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-primary">{event.title}</p>
          {!event.is_recurring && (
            <button
              type="button"
              onClick={() => setActionsOpen(true)}
              aria-label="Event actions"
              className="shrink-0 rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted"
            >
              <DotsThreeVertical size={18} weight="bold" />
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-secondary">{formatTime(startsAt)}</p>
        {event.location && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={14} className="shrink-0" />
            {event.location}
          </p>
        )}
        {relatedTopics.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {relatedTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal transition-colors hover:bg-teal/20"
              >
                <ChatText size={12} /> {topic.title}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-3">
          <RSVPButtons
            eventId={event.id}
            userId={userId}
            currentStatus={currentStatus}
            onChanged={onChanged}
          />
        </div>
        <div className="mt-3">
          <AttendeeList rsvps={rsvps} />
        </div>
      </div>

      <EventActionSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        editHref={`/calendar/${event.id}/edit`}
        onDelete={() => setConfirmOpen(true)}
      />
      <ConfirmSheet
        open={confirmOpen}
        title="Delete this event?"
        description="This can't be undone. Everyone's RSVPs for it will be removed too."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
