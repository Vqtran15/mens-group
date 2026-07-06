"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WarningCircle, Timer, Clock, ArrowCounterClockwise } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentMembership } from "@/lib/supabase/current-membership";
import { SuccessButton, type SubmitStatus } from "@/components/ui/SuccessButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, formatDate, parseDateOnly, toDateOnlyString } from "@/lib/utils";

const fieldClass =
  "w-full min-w-0 max-w-full rounded-xl border border-border bg-white shadow-sm px-3 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const OCCURRENCE_OPTIONS = [
  { value: 1, label: "1st" },
  { value: 2, label: "2nd" },
  { value: 3, label: "3rd" },
  { value: 4, label: "4th" },
  { value: 5, label: "5th" },
];

export function MeetingScheduleForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(4);
  const [occurrences, setOccurrences] = useState<number[]>([]);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(90);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [skippedDates, setSkippedDates] = useState<string[]>([]);
  const [unskipping, setUnskipping] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const membership = await getCurrentMembership(supabase);
      if (!membership) {
        setLoading(false);
        return;
      }
      setGroupId(membership.groupId);
      setUserId(membership.userId);

      const { data } = await supabase
        .from("meeting_schedule")
        .select("*")
        .eq("group_id", membership.groupId)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setScheduleId(data.id);
        setLabel(data.label);
        setDayOfWeek(data.day_of_week);
        setOccurrences(data.occurrences_in_month);
        setTime(data.time_of_day.slice(0, 5));
        setDuration(data.duration_minutes);
        setLocation(data.location ?? "");
        setNotes(data.notes ?? "");
        // Past skipped dates will never be materialized again anyway - only
        // upcoming ones are worth showing, so the list doesn't grow stale
        // and cluttered indefinitely.
        const today = toDateOnlyString(new Date());
        setSkippedDates(
          (data.skipped_dates ?? []).filter((d: string) => d >= today).sort()
        );
      }
      setLoading(false);
    }
    init();
  }, []);

  function toggleOccurrence(value: number) {
    setOccurrences((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value].sort((a, b) => a - b)
    );
  }

  async function handleUnskip(date: string) {
    if (!scheduleId) return;
    setUnskipping(date);
    const supabase = createClient();
    const updated = skippedDates.filter((d) => d !== date);
    const { error } = await supabase
      .from("meeting_schedule")
      .update({ skipped_dates: updated })
      .eq("id", scheduleId);
    setUnskipping(null);
    if (!error) setSkippedDates(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (occurrences.length === 0) {
      setError("Pick at least one occurrence (e.g. 1st and 3rd).");
      return;
    }
    if (!groupId) {
      setError("You must be signed in and belong to a group.");
      return;
    }

    setStatus("submitting");
    const supabase = createClient();

    if (scheduleId) {
      const { error } = await supabase
        .from("meeting_schedule")
        .update({
          label,
          day_of_week: dayOfWeek,
          occurrences_in_month: occurrences,
          time_of_day: time,
          duration_minutes: duration,
          location: location || null,
          notes: notes || null,
        })
        .eq("id", scheduleId);

      if (error) {
        setError(error.message);
        setStatus("idle");
        return;
      }

      // Already-materialized future occurrences were generated from the old
      // rule (title, day/time, location) and won't match the new one - clear
      // them out so Calendar's next load regenerates fresh ones from the
      // updated schedule instead of showing stale entries alongside new ones.
      await supabase
        .from("events")
        .delete()
        .eq("schedule_id", scheduleId)
        .gte("starts_at", new Date().toISOString());
    } else {
      const { error } = await supabase.from("meeting_schedule").insert({
        label,
        day_of_week: dayOfWeek,
        occurrences_in_month: occurrences,
        time_of_day: time,
        duration_minutes: duration,
        location: location || null,
        notes: notes || null,
        created_by: userId,
        group_id: groupId,
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
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {!scheduleId && (
        <p className="text-sm text-secondary">
          Your group doesn&apos;t have a recurring meeting yet - set one up below.
        </p>
      )}
      <div>
        <label htmlFor="label" className="mb-1.5 block text-sm font-medium text-secondary">
          Meeting name
        </label>
        <input
          id="label"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="dayOfWeek" className="mb-1.5 block text-sm font-medium text-secondary">
          Day of week
        </label>
        <select
          id="dayOfWeek"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className={fieldClass}
        >
          {DAYS_OF_WEEK.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-secondary">Which occurrences</p>
        <div className="flex flex-wrap gap-2">
          {OCCURRENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleOccurrence(option.value)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                occurrences.includes(option.value)
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-secondary hover:bg-surface-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          e.g. 1st and 3rd for the first and third {DAYS_OF_WEEK[dayOfWeek].label} of each month.
        </p>
      </div>

      {skippedDates.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-secondary">Skipped dates</p>
          <div className="space-y-2">
            {skippedDates.map((date) => (
              <div
                key={date}
                className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm"
              >
                <p className="flex-1 text-sm text-secondary">{formatDate(parseDateOnly(date))}</p>
                <button
                  type="button"
                  onClick={() => handleUnskip(date)}
                  disabled={unskipping === date}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                >
                  <ArrowCounterClockwise size={16} />
                  {unskipping === date ? "Unskipping..." : "Unskip"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
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
      </div>

      <div>
        <label htmlFor="duration" className="mb-1.5 block text-sm font-medium text-secondary">
          Duration (minutes)
        </label>
        <div className="relative">
          <input
            id="duration"
            type="number"
            min={15}
            step={15}
            required
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={`${fieldClass} appearance-none pr-9`}
          />
          <Timer
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary/60"
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

      <div>
        <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-secondary">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={fieldClass}
        />
      </div>

      <p className="text-xs text-muted">
        {scheduleId
          ? "Saving refreshes the upcoming meetings this schedule generates - any RSVPs already on them will be cleared."
          : "This generates the next few upcoming meetings on your Calendar automatically."}
      </p>

      {error && (
        <p className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
          <WarningCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}

      <SuccessButton
        status={status}
        idleLabel={scheduleId ? "Save changes" : "Create schedule"}
        submittingLabel={scheduleId ? "Saving..." : "Creating..."}
        className="w-full"
      />
    </form>
  );
}
