"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { NotePencil, Plus } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { DraftListItem } from "@/components/topics/DraftListItem";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TopicDraft } from "@/lib/types";

export function DraftsView() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<TopicDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrafts = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("topic_drafts")
      .select("*")
      .order("updated_at", { ascending: false });
    setDrafts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    function init() {
      loadDrafts();
    }
    init();
  }, [loadDrafts]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {drafts.length === 0 ? (
        <EmptyState
          icon={NotePencil}
          title="No drafts yet"
          subtitle="Jot down a topic idea before it's tied to a meeting."
          onClick={() => router.push("/topics/drafts/new")}
        />
      ) : (
        <>
          <Link
            href="/topics/drafts/new"
            className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-white/60 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-white/80"
          >
            <Plus size={18} />
            New draft
          </Link>
          {drafts.map((draft, i) => (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.04 }}
            >
              <DraftListItem draft={draft} onChanged={loadDrafts} />
            </motion.div>
          ))}
        </>
      )}
    </div>
  );
}
