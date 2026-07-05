import Link from "next/link";
import { MapPin, PencilSimple } from "@phosphor-icons/react";
import { formatTime } from "@/lib/utils";
import { RSVPButtons } from "@/components/calendar/RSVPButtons";
import { AttendeeList } from "@/components/calendar/AttendeeList";
import type { CalendarEvent, Rsvp, RsvpStatus } from "@/lib/types";

export function EventListItem({
  event,
  rsvps,
  userId,
  onChanged,
}: {
  event: CalendarEvent;
  rsvps: Rsvp[];
  userId: string;
  onChanged: () => void;
}) {
  const currentStatus: RsvpStatus | null =
    rsvps.find((r) => r.user_id === userId)?.status ?? null;
  const startsAt = new Date(event.starts_at);

  return (
    <div className="flex gap-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-teal/10 text-teal">
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {startsAt.toLocaleDateString("en-US", { month: "short" })}
        </span>
        <span className="text-xl font-bold leading-none">{startsAt.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-primary">{event.title}</p>
          {!event.is_recurring && (
            <Link
              href={`/calendar/${event.id}/edit`}
              aria-label="Edit event"
              className="shrink-0 rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted"
            >
              <PencilSimple size={16} />
            </Link>
          )}
        </div>
        <p className="mt-1 text-sm text-secondary">{formatTime(startsAt)}</p>
        {event.location && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={14} className="shrink-0" />
            {event.location}
          </p>
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
    </div>
  );
}
