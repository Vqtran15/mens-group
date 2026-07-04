"use client";

export const COMMON_EMOJI = [
  "😀", "😂", "😊", "😍", "🤔", "😢", "😮", "😡",
  "👍", "👎", "👏", "🙏", "💪", "🤝", "✌️", "👀",
  "❤️", "🔥", "🎉", "✅", "❌", "⭐", "💯", "🙌",
];

export function EmojiGrid({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1 p-2">
      {COMMON_EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="rounded-lg p-1.5 text-xl transition-colors hover:bg-surface-muted"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
