import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import type { Topic } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function TopicListItem({ topic }: { topic: Topic }) {
  const preview = topic.description ? stripHtml(topic.description) : "";

  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-white p-4 shadow-sm transition-colors hover:bg-surface-muted/40"
    >
      <div className="min-w-0">
        <p className="font-medium text-primary">{topic.title}</p>
        {preview && <p className="mt-1 line-clamp-2 text-sm text-secondary">{preview}</p>}
      </div>
      <CaretRight size={18} className="shrink-0 text-muted" />
    </Link>
  );
}
