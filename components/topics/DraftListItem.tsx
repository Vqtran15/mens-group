"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DotsThreeVertical } from "@phosphor-icons/react";
import { DraftActionSheet } from "@/components/topics/DraftActionSheet";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { createClient } from "@/lib/supabase/client";
import type { TopicDraft } from "@/lib/types";

const MotionLink = motion.create(Link);

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function DraftListItem({ draft, onChanged }: { draft: TopicDraft; onChanged: () => void }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const preview = draft.description ? stripHtml(draft.description) : "";

  async function handleDelete() {
    const supabase = createClient();
    await supabase.from("topic_drafts").delete().eq("id", draft.id);
    setConfirmOpen(false);
    onChanged();
  }

  return (
    <div className="relative rounded-2xl border border-dashed border-border bg-white p-4 shadow-sm transition-colors hover:bg-surface-muted/40">
      <button
        type="button"
        onClick={() => setActionsOpen(true)}
        aria-label="Draft actions"
        className="absolute right-2 top-2 rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-muted"
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>
      <MotionLink
        href={`/topics/drafts/${draft.id}/edit`}
        whileTap={{ scale: 0.97, backgroundColor: "rgba(0,0,0,0.03)" }}
        transition={{ duration: 0.15 }}
        className="block rounded-xl pr-7"
      >
        <p className="truncate font-medium text-primary">{draft.title}</p>
        {preview && <p className="mt-1 line-clamp-2 text-sm text-secondary">{preview}</p>}
      </MotionLink>

      <DraftActionSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        editHref={`/topics/drafts/${draft.id}/edit`}
        convertHref={`/topics/drafts/${draft.id}/convert`}
        onDelete={() => setConfirmOpen(true)}
      />
      <ConfirmSheet
        open={confirmOpen}
        title="Delete this draft?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
