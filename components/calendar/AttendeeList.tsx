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
    return <p className="text-sm text-secondary">No RSVPs yet.</p>;
  }

  return (
    <div className="space-y-1 text-sm text-secondary">
      {(["yes", "maybe", "no"] as const).map((status) =>
        grouped[status].length > 0 ? (
          <p key={status}>
            <span className="font-medium">
              {LABELS[status]} ({grouped[status].length}):
            </span>{" "}
            {grouped[status].map((r) => r.profiles?.display_name ?? "Someone").join(", ")}
          </p>
        ) : null
      )}
    </div>
  );
}
