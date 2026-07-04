import { HandsClapping } from "@phosphor-icons/react";
import { AvatarStack } from "@/components/ui/AvatarStack";
import type { Rsvp } from "@/lib/types";

const LABELS: Record<Rsvp["status"], string> = {
  yes: "Going",
  maybe: "Maybe",
  no: "Not going",
};

export function AttendeeList({ rsvps }: { rsvps: Rsvp[] }) {
  const grouped: Record<Rsvp["status"], Rsvp[]> = { yes: [], maybe: [], no: [] };
  for (const rsvp of rsvps) grouped[rsvp.status].push(rsvp);

  if (rsvps.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-secondary">
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
            <p className="text-sm text-secondary">
              <span className="font-medium">{LABELS[status]}</span> ({grouped[status].length})
            </p>
          </div>
        ) : null
      )}
    </div>
  );
}
