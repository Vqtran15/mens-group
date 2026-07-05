import Link from "next/link";
import { ChatText, MapPin, PencilSimple, Sparkle } from "@phosphor-icons/react";
import { formatTime } from "@/lib/utils";
import { RSVPButtons } from "@/components/calendar/RSVPButtons";
import { AttendeeList } from "@/components/calendar/AttendeeList";
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
  const currentStatus: RsvpStatus | null =
    rsvps.find((r) => r.user_id === userId)?.status ?? null;
  const startsAt = new Date(event.starts_at);

  return (
    <div className="rounded-2xl bg-highlight p-4 shadow-lg shadow-highlight/30">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white/80 text-primary shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            {startsAt.toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="text-xl font-bold leading-none">{startsAt.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkle size={14} weight="fill" /> Next meeting
            </p>
            {!event.is_recurring && (
              <Link
                href={`/calendar/${event.id}/edit`}
                aria-label="Edit event"
                className="shrink-0 rounded-full p-1.5 text-primary transition-colors hover:bg-white/60"
              >
                <PencilSimple size={16} />
              </Link>
            )}
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">{event.title}</p>
          <p className="mt-1 text-primary">{formatTime(startsAt)}</p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-primary">
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
              className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-white"
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
        <AttendeeList rsvps={rsvps} textClassName="text-primary" />
      </div>
    </div>
  );
}
