import { Avatar } from "@/components/Avatar";

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((name, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <Avatar name={name} size={24} ringed />
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
