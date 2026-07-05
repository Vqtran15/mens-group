"use client";

import EmojiPicker, { Theme } from "emoji-picker-react";

export function FullEmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <EmojiPicker
      theme={Theme.LIGHT}
      onEmojiClick={(data) => onSelect(data.emoji)}
      width="100%"
      height={360}
      previewConfig={{ showPreview: false }}
      skinTonesDisabled
      autoFocusSearch={false}
    />
  );
}
