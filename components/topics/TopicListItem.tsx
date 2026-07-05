"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight, DotsThreeVertical } from "@phosphor-icons/react";
import { Avatar, AVATAR_COLORS } from "@/components/Avatar";
import { EditDeleteActionSheet } from "@/components/ui/EditDeleteActionSheet";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { createClient } from "@/lib/supabase/client";
import { formatDate, hashToColor, parseDateOnly } from "@/lib/utils";
import type { Topic } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function TopicListItem({ topic, onChanged }: { topic: Topic; onChanged: () => void }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const preview = topic.description ? stripHtml(topic.description) : "";
  const accentColor = hashToColor(topic.id, AVATAR_COLORS);
  const authorName = topic.profiles?.display_name ?? "Someone";

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("topics").delete().eq("id", topic.id);
    setConfirmOpen(false);
    onChanged();
  }

  return (
    <div
      style={{ borderLeftColor: accentColor }}
      className="relative flex items-center gap-2 rounded-2xl border border-l-4 border-border/60 bg-white p-4 shadow-sm transition-colors hover:bg-surface-muted/40"
    >
      <Link href={`/topics/${topic.id}`} className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate font-medium text-primary">{topic.title}</p>
          <p className="shrink-0 text-xs font-medium text-secondary">
            {formatDate(parseDateOnly(topic.topic_date))}
          </p>
        </div>
        {preview && <p className="mt-1 line-clamp-2 text-sm text-secondary">{preview}</p>}
        <div className="mt-2 flex items-center gap-1.5">
          <Avatar name={authorName} color={topic.profiles?.avatar_color} size={18} />
          <span className="text-xs text-muted">{authorName}</span>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => setActionsOpen(true)}
          aria-label="Topic actions"
          className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted"
        >
          <DotsThreeVertical size={18} weight="bold" />
        </button>
        <CaretRight size={18} className="text-muted" />
      </div>

      <EditDeleteActionSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        editHref={`/topics/${topic.id}/edit`}
        onDelete={() => setConfirmOpen(true)}
      />
      <ConfirmSheet
        open={confirmOpen}
        title="Delete this topic?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
