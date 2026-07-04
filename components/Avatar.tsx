import { cn, getInitials } from "@/lib/utils";

// A friendly, varied palette (not just the brand teal) so people are visually
// distinct in a group, the way GroupMe/Slack color-code avatars per person.
const AVATAR_COLORS = ["#264653", "#2a9d8f", "#e76f51", "#f4a261", "#9c6644", "#577590"];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({
  name,
  size = 32,
  ringed = false,
}: {
  name: string;
  size?: number;
  ringed?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: getAvatarColor(name),
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        ringed && "ring-2 ring-background"
      )}
    >
      {getInitials(name)}
    </div>
  );
}
