import Link from "next/link";
import type { Topic } from "@/lib/types";

export function TopicListItem({ topic }: { topic: Topic }) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="block rounded-xl border border-border bg-white p-4"
    >
      <p className="font-medium text-primary">{topic.title}</p>
      {topic.description && (
        <p className="mt-1 line-clamp-2 text-sm text-secondary">{topic.description}</p>
      )}
    </Link>
  );
}
