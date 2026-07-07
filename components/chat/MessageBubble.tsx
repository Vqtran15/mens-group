"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowBendUpLeft } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { formatTime, cn } from "@/lib/utils";
import { useMessageGestures } from "@/lib/hooks/useMessageGestures";
import { ReactionPills } from "@/components/chat/ReactionPills";
import { ImageLightbox } from "@/components/chat/ImageLightbox";
import type { ChatMessage, Reaction } from "@/lib/types";

export function MessageBubble({
  message,
  isOwn,
  pending,
  reactions,
  currentUserId,
  replyToMessage,
  isEditing,
  onDoubleTapReact,
  onOpenActions,
  onToggleReaction,
  onSaveEdit,
  onCancelEdit,
}: {
  message: ChatMessage;
  isOwn: boolean;
  pending?: boolean;
  reactions: Reaction[];
  currentUserId: string;
  replyToMessage?: ChatMessage | null;
  isEditing: boolean;
  onDoubleTapReact: () => void;
  onOpenActions: () => void;
  onToggleReaction: (emoji: string) => void;
  onSaveEdit: (body: string) => void;
  onCancelEdit: () => void;
}) {
  const name = message.profiles?.display_name ?? "Someone";
  const avatarColor = message.profiles?.avatar_color;
  const [editValue, setEditValue] = useState(message.body);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // While a message is still pending (optimistic, awaiting server confirmation
  // of its real id), skip gesture handling entirely - a long-press/double-tap
  // firing on the stale temp id would otherwise silently target a message
  // that no longer exists once the id swap completes.
  const gestureHandlers = useMessageGestures({
    onDoubleTap: pending ? () => {} : onDoubleTapReact,
    onLongPress: pending ? () => {} : onOpenActions,
  });

  // The image gets its own gesture instance (rather than sharing the text
  // bubble's) so a plain tap can open the lightbox without interfering with
  // double-tap-to-react or long-press-for-actions, which still work on it too.
  const imageGestureHandlers = useMessageGestures({
    onDoubleTap: pending ? () => {} : onDoubleTapReact,
    onLongPress: pending ? () => {} : onOpenActions,
    onSingleTap: pending ? () => {} : () => setLightboxOpen(true),
  });

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex gap-2", isOwn && "flex-row-reverse")}
    >
      <Avatar name={name} color={avatarColor} />
      <div className={cn("flex max-w-[75%] flex-col", isOwn ? "items-end" : "items-start")}>
        <div className={cn("flex items-baseline gap-2", isOwn && "flex-row-reverse")}>
          <p className="text-xs font-medium text-secondary">{name}</p>
          <p className="text-xs text-muted">{formatTime(new Date(message.created_at))}</p>
          {message.edited_at && <p className="text-xs text-muted">(edited)</p>}
        </div>

        {isEditing ? (
          <div className="mt-1 w-full space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 text-secondary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              rows={2}
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onCancelEdit}>
                Cancel
              </Button>
              <Button onClick={() => onSaveEdit(editValue)}>Save</Button>
            </div>
          </div>
        ) : (
          <div className={cn("mt-1 flex w-fit max-w-full flex-col", isOwn ? "items-end" : "items-start", pending && "opacity-60")}>
            {replyToMessage && (
              <div
                {...gestureHandlers}
                className="mb-1.5 flex w-fit max-w-full select-none items-center gap-1 rounded-lg border-l-2 border-primary/40 bg-background/60 px-2 py-1 text-xs text-secondary"
              >
                <ArrowBendUpLeft size={12} className="shrink-0" />
                <span className="truncate">
                  {replyToMessage.profiles?.display_name ?? "Someone"}:{" "}
                  {replyToMessage.body || (replyToMessage.image_url ? "Photo" : "")}
                </span>
              </div>
            )}
            {message.image_url && (
              <div
                {...imageGestureHandlers}
                className={cn("relative select-none overflow-hidden rounded-2xl bg-surface-muted", message.body && "mb-1")}
                style={{ width: 240, aspectRatio: imageAspectRatio ?? 1 }}
              >
                {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
                <Image
                  src={message.image_url}
                  alt="Shared photo"
                  fill
                  sizes="240px"
                  className={cn(
                    "object-cover transition-opacity duration-200",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setImageAspectRatio(img.naturalWidth / img.naturalHeight);
                    }
                    setImageLoaded(true);
                  }}
                />
              </div>
            )}
            {message.body && (
              <div
                {...gestureHandlers}
                className={cn(
                  "w-fit max-w-full select-none rounded-2xl px-3 py-2 shadow-sm",
                  isOwn
                    ? "rounded-br-md bg-primary text-white shadow-primary/20"
                    : "rounded-bl-md bg-white text-secondary"
                )}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
              </div>
            )}
          </div>
        )}

        <ReactionPills reactions={reactions} currentUserId={currentUserId} onToggle={onToggleReaction} />
      </div>

      {message.image_url && (
        <ImageLightbox src={message.image_url} open={lightboxOpen} onClose={() => setLightboxOpen(false)} />
      )}
    </motion.div>
  );
}
