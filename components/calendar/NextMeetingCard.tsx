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
    <div className="relative overflow-hidden rounded-2xl border border-highlight bg-gradient-to-br from-highlight/20 via-sand/10 to-white p-4 shadow-lg shadow-highlight/20">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-highlight/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-sand/20 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-highlight/30 text-primary shadow-sm">
          <span className="text-[10px] font-semibold uppercase tracking-wide">
            {startsAt.toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="text-xl font-bold leading-none">{startsAt.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
              <Sparkle size={14} weight="fill" /> Next meeting
            </p>
            {!event.is_recurring && (
              <Link
                href={`/calendar/${event.id}/edit`}
                aria-label="Edit event"
                className="shrink-0 rounded-full p-1.5 text-secondary transition-colors hover:bg-white/60"
              >
                <PencilSimple size={16} />
              </Link>
            )}
          </div>
          <p className="mt-1 text-xl font-semibold text-primary">{event.title}</p>
          <p className="mt-1 text-secondary">{formatTime(startsAt)}</p>
          {event.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={14} className="shrink-0" />
              {event.location}
            </p>
          )}
        </div>
      </div>

      {relatedTopics.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-2">
          {relatedTopics.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-white"
            >
              <ChatText size={12} /> {topic.title}
            </Link>
          ))}
        </div>
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
