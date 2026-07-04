"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WarningCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { Button } from "@/components/ui/Button";

const fieldClass =
  "w-full rounded-xl border border-border bg-background/50 px-3 py-2.5 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20";

export function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const membership = await getCurrentMembership(supabase);
    if (!membership) {
      setError("You must be signed in and belong to a group.");
      setSubmitting(false);
      return;
    }

    const startsAt = new Date(`${date}T${time}`);
    const { error } = await supabase.from("events").insert({
      title,
      description: description || null,
      starts_at: startsAt.toISOString(),
      location: location || null,
      created_by: membership.userId,
      group_id: membership.groupId,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/calendar");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div>
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
      </div>
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-secondary">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-secondary">
            Date
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="time" className="mb-1.5 block text-sm font-medium text-secondary">
            Time
          </label>
          <input
            id="time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-secondary">
          Location
        </label>
        <input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={fieldClass}
        />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Adding..." : "Add event"}
      </Button>
    </form>
  );
}
