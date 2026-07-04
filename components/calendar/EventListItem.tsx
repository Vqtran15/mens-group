import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import { formatDateTime } from "@/lib/utils";
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

  return (
    <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
      <p className="font-medium text-primary">{event.title}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-secondary">
        <CalendarBlank size={14} className="shrink-0" />
        {formatDateTime(new Date(event.starts_at))}
      </p>
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
  );
}
