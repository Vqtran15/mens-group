import { Avatar } from "@/components/Avatar";

export interface AvatarStackPerson {
  name: string;
  color?: string | null;
}

export function AvatarStack({ people, max = 4 }: { people: AvatarStackPerson[]; max?: number }) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((person, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <Avatar name={person.name} color={person.color} size={24} ringed />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{ marginLeft: -8 }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-[10px] font-semibold text-secondary ring-2 ring-background"
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
