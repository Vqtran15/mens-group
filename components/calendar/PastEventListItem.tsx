"use client";

import Link from "next/link";
import { ChatText, MapPin } from "@phosphor-icons/react";
import { formatTime } from "@/lib/utils";
import { AttendeeList } from "@/components/calendar/AttendeeList";
import type { CalendarEvent, RelatedTopic, Rsvp } from "@/lib/types";

// A read-only sibling of EventListItem for events that have already
// happened - no RSVPButtons (changing your own RSVP after the fact doesn't
// mean anything) and no "•••" edit/delete/skip menu (past events aren't
// editable), but AttendeeList stays so who-RSVP'd is still checkable.
export function PastEventListItem({
  event,
  rsvps,
  relatedTopics = [],
}: {
  event: CalendarEvent;
  rsvps: Rsvp[];
  relatedTopics?: RelatedTopic[];
}) {
  const startsAt = new Date(event.starts_at);

  return (
    <div className="flex gap-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-teal/10 text-teal shadow-sm">
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {startsAt.toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-xl font-bold leading-none">{startsAt.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-primary">{event.title}</p>
        <p className="mt-1 text-sm text-secondary">{formatTime(startsAt)}</p>
        {event.location && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
            <MapPin size={14} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{event.location}</span>
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
          <AttendeeList rsvps={rsvps} />
        </div>
      </div>
    </div>
  );
}
