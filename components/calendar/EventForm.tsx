"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { WarningCircle, CalendarBlank, Clock } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { Skeleton } from "@/components/ui/Skeleton";

const fieldClass =
  "w-full min-w-0 max-w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

function toTimeInputValue(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function EventForm({ eventId }: { eventId?: string }) {
  const router = useRouter();
  const isEditing = Boolean(eventId);
  const [loading, setLoading] = useState(isEditing);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (!eventId) return;
    const supabase = createClient();
    supabase
      .from("events")
      .select("title, starts_at, location")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setDate(toDateInputValue(data.starts_at));
          setTime(toTimeInputValue(data.starts_at));
          setLocation(data.location ?? "");
        }
        setLoading(false);
      });
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("submitting");

    const supabase = createClient();
    const startsAt = new Date(`${date}T${time}`);

    if (eventId) {
      const { error } = await supabase
        .from("events")
        .update({
          title,
          starts_at: startsAt.toISOString(),
          location: location || null,
        })
        .eq("id", eventId);

      if (error) {
        setError(error.message);
        setStatus("idle");
        return;
      }
    } else {
      const membership = await getCurrentMembership(supabase);
      if (!membership) {
        setError("You must be signed in and belong to a group.");
        setStatus("idle");
        return;
      }

      const { error } = await supabase.from("events").insert({
        title,
        starts_at: startsAt.toISOString(),
        location: location || null,
        created_by: membership.userId,
        group_id: membership.groupId,
      });

      if (error) {
        setError(error.message);
        setStatus("idle");
        return;
      }
    }

    setStatus("success");
    setTimeout(() => {
      router.push("/calendar");
      router.refresh();
    }, 500);
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
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
        transition={{ duration: 0.25, delay: 0.06, ease: "easeOut" }}
      >
        <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-secondary">
          Date
        </label>
        <div className="relative">
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${fieldClass} appearance-none pr-9`}
          />
          <CalendarBlank
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60"
          />
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.12, ease: "easeOut" }}
      >
        <label htmlFor="time" className="mb-1.5 block text-sm font-medium text-secondary">
          Time
        </label>
        <div className="relative">
          <input
            id="time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`${fieldClass} appearance-none pr-9`}
          />
          <Clock
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60"
          />
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.18, ease: "easeOut" }}
      >
        <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-secondary">
          Location
        </label>
        <input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={fieldClass}
        />
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
        <SuccessButton
          status={status}
          idleLabel={isEditing ? "Save changes" : "Add event"}
          submittingLabel={isEditing ? "Saving..." : "Adding..."}
          className="w-full"
        />
      </motion.div>
    </form>
  );
}
