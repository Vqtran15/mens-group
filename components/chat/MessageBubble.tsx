"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowBendUpLeft } from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/Button";
import { formatTime, cn } from "@/lib/utils";
import { useMessageGestures } from "@/lib/hooks/useMessageGestures";
import { ReactionPills } from "@/components/chat/ReactionPills";
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

  // While a message is still pending (optimistic, awaiting server confirmation
  // of its real id), skip gesture handling entirely - a long-press/double-tap
  // firing on the stale temp id would otherwise silently target a message
  // that no longer exists once the id swap completes.
  const gestureHandlers = useMessageGestures({
    onDoubleTap: pending ? () => {} : onDoubleTapReact,
    onLongPress: pending ? () => {} : onOpenActions,
  });

  return (
    <div className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
      <Avatar name={name} color={avatarColor} />
      <div className={cn("max-w-[75%]", isOwn && "items-end text-right")}>
        <div className={cn("flex items-baseline gap-2", isOwn && "flex-row-reverse")}>
          <p className="text-xs font-medium text-secondary">{name}</p>
          <p className="text-xs text-muted">{formatTime(new Date(message.created_at))}</p>
          {message.edited_at && <p className="text-xs text-muted">(edited)</p>}
        </div>

        {isEditing ? (
          <div className="mt-1 space-y-2">
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
          <div
            {...gestureHandlers}
            className={cn(
              "mt-1 select-none rounded-2xl px-3 py-2 shadow-sm",
              isOwn
                ? "rounded-br-md bg-primary text-white shadow-primary/20"
                : "rounded-bl-md bg-white text-secondary",
              pending && "opacity-60"
            )}
          >
            {replyToMessage && (
              <div
                className={cn(
                  "mb-1.5 flex items-center gap-1 rounded-lg border-l-2 px-2 py-1 text-xs",
                  isOwn ? "border-white/50 bg-white/10" : "border-primary/40 bg-background/60"
                )}
              >
                <ArrowBendUpLeft size={12} className="shrink-0" />
                <span className="truncate">
                  {replyToMessage.profiles?.display_name ?? "Someone"}:{" "}
                  {replyToMessage.body || (replyToMessage.image_url ? "Photo" : "")}
                </span>
              </div>
            )}
            {message.image_url && (
              <Image
                src={message.image_url}
                alt="Shared photo"
                width={240}
                height={240}
                unoptimized
                className="mb-1 max-h-60 w-full rounded-lg object-cover"
              />
            )}
            {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
          </div>
        )}

        <ReactionPills reactions={reactions} currentUserId={currentUserId} onToggle={onToggleReaction} />
      </div>
    </div>
  );
}
