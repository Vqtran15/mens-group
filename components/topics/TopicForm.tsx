"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { getUpcomingMeetingDates } from "@/lib/supabase/getUpcomingMeetingDates";
import { RichTextEditor } from "@/components/topics/RichTextEditor";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, parseDateOnly, toDateOnlyString } from "@/lib/utils";

const fieldClass =
  "h-[46px] w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function TopicForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topicDate, setTopicDate] = useState("");
  const [meetingDates, setMeetingDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [draftStatus, setDraftStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const membership = await getCurrentMembership(supabase);
      if (!membership) {
        setLoadingDates(false);
        return;
      }
      const dates = await getUpcomingMeetingDates(supabase, membership.groupId);
      setMeetingDates(dates);
      setTopicDate(dates[0] ?? toDateOnlyString(new Date()));
      setLoadingDates(false);
    }
    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Guards against the draft save (a sibling action, not disabled by this
    // button's own status) finishing mid-flight at the same time as this one.
    if (draftStatus !== "idle") return;
    setError(null);
    setStatus("submitting");

    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) {
      setError("You must be signed in and belong to a group.");
      setStatus("idle");
      return;
    }

    const { data: topic, error } = await supabase
      .from("topics")
      .insert({
        title,
        topic_date: topicDate,
        description: description || null,
        created_by: membership.userId,
        group_id: membership.groupId,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setStatus("idle");
      return;
    }

    setStatus("success");
    setTimeout(() => {
      router.push(`/topics/${topic.id}`);
      router.refresh();
    }, 500);
  }

  // Drafts have no topic_date (see DraftForm/topic_drafts - they're not
  // tied to a meeting until converted), so this skips that field entirely
  // rather than reusing whatever's currently picked above. type="button" on
  // the triggering SuccessButton is load-bearing here: it keeps this from
  // running through the <form>'s own required-field (topicDate) validation,
  // which only makes sense for the real "Add topic" submit.
  async function handleSaveAsDraft() {
    if (status !== "idle") return;
    if (!title.trim()) {
      setError("Give it a title before saving as a draft.");
      return;
    }
    setError(null);
    setDraftStatus("submitting");

    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) {
      setError("You must be signed in and belong to a group.");
      setDraftStatus("idle");
      return;
    }

    const { error: insertError } = await supabase.from("topic_drafts").insert({
      title,
      description: description || null,
      created_by: membership.userId,
      group_id: membership.groupId,
    });

    if (insertError) {
      setError(insertError.message);
      setDraftStatus("idle");
      return;
    }

    setDraftStatus("success");
    setTimeout(() => {
      router.push("/topics/drafts");
      router.refresh();
    }, 500);
  }

  if (loadingDates) {
    return (
      <div className="space-y-4 p-4">
        <div>
          <Skeleton className="mb-1.5 h-[17px] w-10" />
          <Skeleton className="h-[46px] w-full" />
        </div>
        <div>
          <Skeleton className="mb-1.5 h-[17px] w-24" />
          <Skeleton className="h-[46px] w-full" />
        </div>
        <div>
          <Skeleton className="mb-1.5 h-[17px] w-20" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
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
        <p className="mt-1.5 text-xs text-muted">
          {meetingDates.length === 0
            ? "No meetings scheduled yet - pick any date."
            : "Which meeting is this topic about?"}
        </p>
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
        className="flex gap-2"
      >
        <SuccessButton
          status={draftStatus}
          idleLabel="Save as draft"
          submittingLabel="Saving..."
          type="button"
          variant="secondary"
          onClick={handleSaveAsDraft}
          className="flex-1"
        />
        <SuccessButton status={status} idleLabel="Add topic" submittingLabel="Adding..." className="flex-1" />
      </motion.div>
    </form>
  );
}
