import { Avatar } from "@/components/Avatar";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({
  message,
  isOwn,
  pending,
}: {
  message: ChatMessage;
  isOwn: boolean;
  pending?: boolean;
}) {
  const name = message.profiles?.display_name ?? "Someone";

  return (
    <div className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
      <Avatar name={name} />
      <div className={cn("max-w-[75%]", isOwn && "items-end text-right")}>
        <div
          className={cn(
            "flex items-baseline gap-2",
            isOwn && "flex-row-reverse"
          )}
        >
          <p className="text-xs font-medium text-secondary">{name}</p>
          <p className="text-xs text-muted">{formatTime(new Date(message.created_at))}</p>
        </div>
        <div
          className={cn(
            "mt-1 rounded-2xl px-3 py-2",
            isOwn ? "bg-primary text-white" : "bg-white text-secondary",
            pending && "opacity-60"
          )}
        >
          <p className="whitespace-pre-wrap">{message.body}</p>
        </div>
      </div>
    </div>
  );
}
