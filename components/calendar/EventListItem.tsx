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
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="font-medium text-primary">{event.title}</p>
      <p className="text-sm text-secondary">{formatDateTime(new Date(event.starts_at))}</p>
      {event.location && <p className="text-sm text-muted">{event.location}</p>}
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
