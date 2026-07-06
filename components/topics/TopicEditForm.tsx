"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getUpcomingMeetingDates } from "@/lib/supabase/getUpcomingMeetingDates";
import { RichTextEditor } from "@/components/topics/RichTextEditor";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, parseDateOnly } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function TopicEditForm({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [topicDate, setTopicDate] = useState("");
  const [meetingDates, setMeetingDates] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data } = await supabase
        .from("topics")
        .select("title, description, topic_date, group_id")
        .eq("id", topicId)
        .single();

      if (data) {
        setTitle(data.title);
        setDescription(data.description ?? "");
        setTopicDate(data.topic_date);

        const dates = await getUpcomingMeetingDates(supabase, data.group_id);
        // Keep the currently-saved date selectable even if its meeting has
        // already passed and dropped out of the "upcoming" list.
        setMeetingDates(
          dates.includes(data.topic_date) ? dates : [data.topic_date, ...dates].sort()
        );
      }
      setLoading(false);
    }
    init();
  }, [topicId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    const supabase = createClient();
    const { error } = await supabase
      .from("topics")
      .update({ title, topic_date: topicDate, description: description || null })
      .eq("id", topicId);

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }

    setStatus("success");
    setTimeout(() => {
      router.push(`/topics/${topicId}`);
      router.refresh();
    }, 500);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-secondary">
          Title
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={fieldClass}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.08, ease: "easeOut" }}
      >
        <label htmlFor="topicDate" className="mb-1.5 block text-sm font-medium text-secondary">
          Meeting date
        </label>
        {meetingDates.length > 0 ? (
          <select
            id="topicDate"
            required
            value={topicDate}
            onChange={(e) => setTopicDate(e.target.value)}
            className={fieldClass}
          >
            {meetingDates.map((date) => (
              <option key={date} value={date}>
                {formatDate(parseDateOnly(date))}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="topicDate"
            type="date"
            required
            value={topicDate}
            onChange={(e) => setTopicDate(e.target.value)}
            className={fieldClass}
          />
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.16, ease: "easeOut" }}
      >
        <label className="mb-1.5 block text-sm font-medium text-secondary">Description</label>
        <RichTextEditor value={description} onChange={setDescription} />
      </motion.div>
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.24, ease: "easeOut" }}
      >
        <SuccessButton status={status} idleLabel="Save changes" submittingLabel="Saving..." className="w-full" />
      </motion.div>
    </form>
  );
}
