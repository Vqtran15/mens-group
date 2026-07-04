"use client";

import { cn } from "@/lib/utils";
import type { Reaction } from "@/lib/types";

export function ReactionPills({
  reactions,
  currentUserId,
  onToggle,
}: {
  reactions: Reaction[];
  currentUserId: string;
  onToggle: (emoji: string) => void;
}) {
  if (reactions.length === 0) return null;

  const grouped = new Map<string, Reaction[]>();
  for (const r of reactions) {
    grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), r]);
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {[...grouped.entries()].map(([emoji, group]) => {
        const mine = group.some((r) => r.user_id === currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
              mine ? "border-primary bg-primary/10" : "border-border bg-white"
            )}
          >
            <span>{emoji}</span>
            <span className="text-secondary">{group.length}</span>
          </button>
        );
      })}
    </div>
  );
}
