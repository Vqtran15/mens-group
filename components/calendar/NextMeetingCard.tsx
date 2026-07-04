import { CalendarBlank, MapPin, Sparkle } from "@phosphor-icons/react";
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
    <div className="relative overflow-hidden rounded-2xl border border-highlight bg-white p-5 shadow-lg shadow-highlight/20">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-highlight/20 blur-2xl" />
      <p className="relative flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
        <Sparkle size={14} weight="fill" /> Next meeting
      </p>
      <p className="relative mt-1 text-xl font-semibold text-primary">{event.title}</p>
      <p className="relative mt-2 flex items-center gap-1.5 text-secondary">
        <CalendarBlank size={16} className="shrink-0" />
        {formatDateTime(new Date(event.starts_at))}
      </p>
      {event.location && (
        <p className="relative mt-1 flex items-center gap-1.5 text-sm text-muted">
          <MapPin size={16} className="shrink-0" />
          {event.location}
        </p>
      )}
      <div className="relative mt-4">
        <RSVPButtons
          eventId={event.id}
          userId={userId}
          currentStatus={currentStatus}
          onChanged={onChanged}
        />
      </div>
      <div className="relative mt-4">
        <AttendeeList rsvps={rsvps} />
      </div>
    </div>
  );
}
