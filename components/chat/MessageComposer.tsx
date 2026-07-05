"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { EmojiPickerPopover } from "@/components/chat/EmojiPickerPopover";
import type { ChatMessage } from "@/lib/types";

export function MessageComposer({
  onSend,
  replyingTo,
  onCancelReply,
}: {
  onSend: (input: { body: string; imageFile: File | null }) => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
}) {
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed && !imageFile) return;
    onSend({ body: trimmed, imageFile });
    setBody("");
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="border-t border-border/60 bg-white/90 backdrop-blur-sm"
    >
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-sm">
          <p className="truncate text-secondary">
            Replying to <span className="font-medium">{replyingTo.profiles?.display_name ?? "Someone"}</span>:{" "}
            {replyingTo.body || (replyingTo.image_url ? "Photo" : "")}
          </p>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="shrink-0 text-muted">
            <X size={16} />
          </button>
        </div>
      )}
      {imageFile && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
          <p className="truncate text-secondary">{imageFile.name}</p>
          <button
            type="button"
            onClick={() => {
              setImageFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            aria-label="Remove photo"
            className="shrink-0 text-muted"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach photo"
          className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted"
        >
          <ImageIcon size={20} />
        </button>
        <EmojiPickerPopover onSelect={(emoji) => setBody((b) => b + emoji)} />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-full border border-border bg-background/60 px-4 py-2 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
        />
        <motion.button
          whileTap={{ scale: 0.85, rotate: -15 }}
          type="submit"
          disabled={!body.trim() && !imageFile}
          aria-label="Send message"
          className="rounded-full bg-primary p-3 text-white shadow-md shadow-primary/30 disabled:opacity-60"
        >
          <PaperPlaneTilt size={18} weight="fill" />
        </motion.button>
      </form>
    </motion.div>
  );
}
