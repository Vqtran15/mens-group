import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

interface RecurrenceConfig {
  dayOfWeek: number;
  occurrencesInMonth: number[];
  timeOfDay: string;
}

function getNextOccurrence(config: RecurrenceConfig, from: Date): Date {
  let year = from.getFullYear();
  let month = from.getMonth();

  for (let monthsAhead = 0; monthsAhead < 3; monthsAhead++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let matchIndex = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (date.getDay() === config.dayOfWeek) {
        matchIndex++;
        if (config.occurrencesInMonth.includes(matchIndex)) {
          const [hours, minutes] = config.timeOfDay.split(":").map(Number);
          date.setHours(hours, minutes, 0, 0);
          if (date.getTime() >= from.getTime()) return date;
        }
      }
    }
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  throw new Error("No upcoming occurrence found within 3 months");
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

Deno.serve(async () => {
  const { data: schedule } = await supabase
    .from("meeting_schedule")
    .select("*")
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!schedule) {
    return Response.json({ skipped: "no active schedule" });
  }

  const now = new Date();
  const next = getNextOccurrence(
    {
      dayOfWeek: schedule.day_of_week,
      occurrencesInMonth: schedule.occurrences_in_month,
      timeOfDay: schedule.time_of_day,
    },
    now
  );

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (!isSameCalendarDay(next, tomorrow)) {
    return Response.json({ skipped: "next meeting is not tomorrow", next });
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  const notification = JSON.stringify({
    title: schedule.label,
    body: `Tomorrow at ${schedule.time_of_day.slice(0, 5)}${schedule.location ? " — " + schedule.location : ""}`,
    url: "/calendar",
  });

  let sent = 0;
  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return Response.json({ sent, total: subscriptions?.length ?? 0 });
});
