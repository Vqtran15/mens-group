import { HandsClapping } from "@phosphor-icons/react";
import { AvatarStack } from "@/components/ui/AvatarStack";
import { cn } from "@/lib/utils";
import type { Rsvp } from "@/lib/types";

const LABELS: Record<Rsvp["status"], string> = {
  yes: "Going",
  maybe: "Maybe",
  no: "Not going",
};

// Defaults to `text-secondary`, which has good contrast on the white cards
// this renders in most places - callers on a darker/tinted background (e.g.
// NextMeetingCard's solid gold) should pass a higher-contrast override.
export function AttendeeList({
  rsvps,
  textClassName = "text-secondary",
}: {
  rsvps: Rsvp[];
  textClassName?: string;
}) {
  const grouped: Record<Rsvp["status"], Rsvp[]> = { yes: [], maybe: [], no: [] };
  for (const rsvp of rsvps) grouped[rsvp.status].push(rsvp);

  if (rsvps.length === 0) {
    return (
      <p className={cn("flex items-center gap-1.5 text-sm", textClassName)}>
        <HandsClapping size={16} className="shrink-0" />
        No RSVPs yet — be the first to say you&apos;re in!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {(["yes", "maybe", "no"] as const).map((status) =>
        grouped[status].length > 0 ? (
          <div key={status} className="flex items-center gap-2">
            <AvatarStack
              people={grouped[status].map((r) => ({
                name: r.profiles?.display_name ?? "Someone",
                color: r.profiles?.avatar_color,
              }))}
            />
            <p className={cn("text-sm", textClassName)}>
              <span className="font-medium">{LABELS[status]}</span> ({grouped[status].length})
            </p>
          </div>
        ) : null
      )}
    </div>
  );
}
