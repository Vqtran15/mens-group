"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { BackButton } from "@/components/ui/BackButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { richTextContentClass } from "@/lib/richTextStyles";
import { sanitizeRichText } from "@/lib/sanitizeRichText";
import { formatDate, parseDateOnly } from "@/lib/utils";
import type { Topic } from "@/lib/types";

export function TopicDetailView({ topicId }: { topicId: string }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabase = createClient();
      const { data } = await supabase.from("topics").select("*").eq("id", topicId).single();
      if (cancelled) return;
      setTopic(data);
      setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [topicId]);

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="p-4">
        <EmptyState icon={MagnifyingGlass} title="Topic not found" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 p-4">
        <div className="flex items-start gap-2">
          <BackButton href="/topics" />
          <div>
            <h1 className="text-xl font-semibold text-primary">{topic.title}</h1>
            <p className="text-sm text-muted">{formatDate(parseDateOnly(topic.topic_date))}</p>
          </div>
        </div>
        <Link
          href={`/topics/${topicId}/edit`}
          aria-label="Edit topic"
          className="mt-1 shrink-0 rounded-full p-2 text-secondary transition-colors hover:bg-surface-muted"
        >
          <PencilSimple size={18} />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {topic.description ? (
          <div
            className={richTextContentClass}
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(topic.description) }}
          />
        ) : (
          <p className="flex items-center gap-1.5 text-secondary">
            <PencilSimple size={16} className="shrink-0" />
            Nothing here yet — tap the pencil to add some details
          </p>
        )}
      </div>
    </div>
  );
}
