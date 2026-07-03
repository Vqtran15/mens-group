import { formatDateTime } from "@/lib/utils";
import { RSVPButtons } from "@/components/calendar/RSVPButtons";
import { AttendeeList } from "@/components/calendar/AttendeeList";
import type { CalendarEvent, Rsvp, RsvpStatus } from "@/lib/types";

export function NextMeetingCard({
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
    <div className="rounded-xl border-2 border-highlight bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Next meeting</p>
      <p className="mt-1 text-xl font-semibold text-primary">{event.title}</p>
      <p className="mt-1 text-secondary">{formatDateTime(new Date(event.starts_at))}</p>
      {event.location && <p className="text-sm text-muted">{event.location}</p>}
      <div className="mt-4">
        <RSVPButtons
          eventId={event.id}
          userId={userId}
          currentStatus={currentStatus}
          onChanged={onChanged}
        />
      </div>
      <div className="mt-4">
        <AttendeeList rsvps={rsvps} />
      </div>
    </div>
  );
}
