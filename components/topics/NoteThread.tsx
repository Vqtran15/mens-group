import { Avatar } from "@/components/Avatar";
import { formatDateTime } from "@/lib/utils";
import type { TopicNote } from "@/lib/types";

export function NoteThread({ notes }: { notes: TopicNote[] }) {
  if (notes.length === 0) {
    return <p className="text-secondary">No notes yet. Be the first to add one.</p>;
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="flex gap-3">
          <Avatar name={note.profiles?.display_name ?? "?"} />
          <div className="flex-1 rounded-xl border border-border bg-white p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-primary">
                {note.profiles?.display_name ?? "Someone"}
              </p>
              <p className="text-xs text-muted">{formatDateTime(new Date(note.created_at))}</p>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-secondary">{note.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
