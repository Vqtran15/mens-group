"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowBendUpLeft, CircleNotch } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { formatTime, cn } from "@/lib/utils";
import { useMessageGestures } from "@/lib/hooks/useMessageGestures";
import { ReactionPills } from "@/components/chat/ReactionPills";
import { ImageLightbox } from "@/components/chat/ImageLightbox";
import type { ChatMessage, Reaction } from "@/lib/types";

const MAX_THUMBNAILS = 4;

export function MessageBubble({
  message,
  isOwn,
  pending,
  uploadingImages,
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
  uploadingImages?: boolean;
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // A tap needs to know which specific thumbnail the pointer went down on,
  // but the gesture hook's timers (and its double-tap/long-press state) are
  // shared across every image in the grid - one instance, not one per image.
  const pendingImageIndexRef = useRef(0);

  // While a message is still pending (optimistic, awaiting server confirmation
  // of its real id), skip gesture handling entirely - a long-press/double-tap
  // firing on the stale temp id would otherwise silently target a message
  // that no longer exists once the id swap completes.
  const gestureHandlers = useMessageGestures({
    onDoubleTap: pending ? () => {} : onDoubleTapReact,
    onLongPress: pending ? () => {} : onOpenActions,
  });

  // The images get their own gesture instance (rather than sharing the text
  // bubble's) so a plain tap can open the lightbox without interfering with
  // double-tap-to-react or long-press-for-actions, which still work on them too.
  const imageGestureHandlers = useMessageGestures({
    onDoubleTap: pending ? () => {} : onDoubleTapReact,
    onLongPress: pending ? () => {} : onOpenActions,
    onSingleTap: pending || uploadingImages ? () => {} : () => setLightboxIndex(pendingImageIndexRef.current),
  });

  const images = message.image_urls;
  const visibleImages = images.slice(0, MAX_THUMBNAILS);
  const hiddenCount = images.length - visibleImages.length;

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
                  {replyToMessage.body || (replyToMessage.image_urls.length > 0 ? "Photo" : "")}
                </span>
              </div>
            )}
            {images.length === 1 && (
              <div
                {...imageGestureHandlers}
                onPointerDown={() => {
                  pendingImageIndexRef.current = 0;
                  imageGestureHandlers.onPointerDown();
                }}
                className={cn("relative select-none overflow-hidden rounded-2xl bg-surface-muted", message.body && "mb-1")}
                style={{ width: 240, aspectRatio: imageAspectRatio ?? 1 }}
              >
                {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
                {uploadingImages ? (
                  // A blob: preview URL isn't fetchable by Next/Image's
                  // server-side optimizer, so it needs a plain <img> during
                  // the upload window - swapped for next/image's <Image>
                  // once the real hosted URL replaces it.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[0]} alt="Shared photo" className="h-full w-full object-cover" />
                ) : (
                  <Image
                    src={images[0]}
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
                )}
                {uploadingImages && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <CircleNotch size={28} className="animate-spin text-white" />
                  </div>
                )}
              </div>
            )}
            {images.length > 1 && (
              <div
                className={cn("grid w-[244px] grid-cols-2 gap-1 overflow-hidden rounded-2xl", message.body && "mb-1")}
              >
                {visibleImages.map((url, i) => {
                  const showOverlay = hiddenCount > 0 && i === visibleImages.length - 1;
                  return (
                    <div
                      key={url}
                      {...imageGestureHandlers}
                      onPointerDown={() => {
                        pendingImageIndexRef.current = i;
                        imageGestureHandlers.onPointerDown();
                      }}
                      className="relative aspect-square select-none overflow-hidden bg-surface-muted"
                    >
                      {uploadingImages ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="Shared photo" className="h-full w-full object-cover" />
                      ) : (
                        <Image src={url} alt="Shared photo" fill sizes="122px" className="object-cover" />
                      )}
                      {uploadingImages && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <CircleNotch size={22} className="animate-spin text-white" />
                        </div>
                      )}
                      {showOverlay && !uploadingImages && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                          +{hiddenCount}
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {lightboxIndex !== null && images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          open={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </motion.div>
  );
}
