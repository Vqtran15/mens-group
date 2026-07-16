import Image from "next/image";
import { cn, getInitials, hashToColor } from "@/lib/utils";

// A friendly, varied palette (not just the brand teal) so people are visually
// distinct in a group, the way GroupMe/Slack color-code avatars per person.
// Also offered as the choices in Settings for a user-picked avatar color.
export const AVATAR_COLORS = [
  "#264653",
  "#2a9d8f",
  "#e76f51",
  "#f4a261",
  "#9c6644",
  "#577590",
  "#e9c46a",
  "#8ab17d",
  "#c05299",
  "#5b6bc0",
];

export function Avatar({
  name,
  color,
  imageUrl,
  size = 32,
  ringed = false,
}: {
  name: string;
  color?: string | null;
  imageUrl?: string | null;
  size?: number;
  ringed?: boolean;
}) {
  if (imageUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn("relative shrink-0 overflow-hidden rounded-full", ringed && "ring-2 ring-background")}
      >
        <Image src={imageUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: color || hashToColor(name, AVATAR_COLORS),
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
