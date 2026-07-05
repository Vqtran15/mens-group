"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarBlank, ChatText, MagnifyingGlass, PencilSimple } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_COLORS } from "@/components/Avatar";
import { BackButton } from "@/components/ui/BackButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { richTextContentClass } from "@/lib/richTextStyles";
import { sanitizeRichText } from "@/lib/sanitizeRichText";
import { formatDate, hashToColor, parseDateOnly } from "@/lib/utils";
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

  const accentColor = hashToColor(topic.id, AVATAR_COLORS);

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative overflow-hidden p-4"
        style={{ background: `linear-gradient(135deg, ${accentColor}26, transparent 70%)` }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl"
          style={{ backgroundColor: `${accentColor}33` }}
        />
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <BackButton href="/topics" />
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: accentColor }}
              >
                <ChatText size={18} weight="fill" className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-xl font-semibold text-primary">{topic.title}</h1>
                <span
                  className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
                >
                  <CalendarBlank size={12} />
                  {formatDate(parseDateOnly(topic.topic_date))}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/topics/${topicId}/edit`}
            aria-label="Edit topic"
            className="mt-1 shrink-0 rounded-full p-2 text-secondary transition-colors hover:bg-white/60"
          >
            <PencilSimple size={18} />
          </Link>
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        {topic.description ? (
          <div className="min-w-0 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
            <div
              className={`${richTextContentClass} min-w-0 break-words`}
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(topic.description) }}
            />
          </div>
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
