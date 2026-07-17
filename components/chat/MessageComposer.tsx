"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { EmojiPickerPopover } from "@/components/chat/EmojiPickerPopover";
import type { ChatMessage } from "@/lib/types";

export const MessageComposer = forwardRef<HTMLInputElement, {
  onSend: (input: { body: string; imageFiles: File[] }) => void;
  replyingTo: ChatMessage | null;
  onCancelReply: () => void;
}>(function MessageComposer({ onSend, replyingTo, onCancelReply }, forwardedRef) {
  const [body, setBody] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => bodyInputRef.current as HTMLInputElement);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed && imageFiles.length === 0) return;
    onSend({ body: trimmed, imageFiles });
    setBody("");
    setImageFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImageAt(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    // The file input itself still holds the original FileList - clearing it
    // avoids re-adding a removed file if the user picks "attach photo" again
    // without having changed the underlying selection.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="border-t border-border/60 bg-white/90 backdrop-blur-sm"
    >
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-sm">
          <p className="truncate text-secondary">
            Replying to <span className="font-medium">{replyingTo.profiles?.display_name ?? "Someone"}</span>:{" "}
            {replyingTo.body || (replyingTo.image_urls.length > 0 ? "Photo" : replyingTo.shared_title ?? "")}
          </p>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="shrink-0 text-muted">
            <X size={16} />
          </button>
        </div>
      )}
      {imageFiles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
          {imageFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted py-1 pl-3 pr-1.5 text-sm"
            >
              <p className="max-w-[120px] truncate text-secondary">{file.name}</p>
              <button
                type="button"
                onClick={() => removeImageAt(i)}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 rounded-full p-1 text-muted transition-colors hover:bg-border/60"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => setImageFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach photos"
          className="rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted"
        >
          <ImageIcon size={20} />
        </button>
        <EmojiPickerPopover onSelect={(emoji) => setBody((b) => b + emoji)} />
        <input
          ref={bodyInputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message..."
          className="flex-1 rounded-full border border-border bg-white px-4 py-2 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <motion.button
          whileTap={{ scale: 0.85, rotate: -15 }}
          type="submit"
          disabled={!body.trim() && imageFiles.length === 0}
          aria-label="Send message"
          className="rounded-full bg-primary p-3 text-white shadow-md shadow-primary/30 disabled:opacity-60"
        >
          <PaperPlaneTilt size={18} weight="fill" />
        </motion.button>
      </form>
    </motion.div>
  );
});
