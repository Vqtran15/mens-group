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

Deno.serve(async (req) => {
  const payload = await req.json();
  const message = payload.record as {
    id: string;
    body: string;
    created_by: string;
    group_id: string;
  };

  const { data: sender } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", message.created_by)
    .single();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("group_id", message.group_id)
    .neq("user_id", message.created_by);

  const notification = JSON.stringify({
    title: sender?.display_name ?? "Men's Group",
    body: message.body.slice(0, 120),
    url: "/chat",
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
