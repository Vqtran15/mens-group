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
  const recordId = (payload.record as { id?: string })?.id;
  if (!recordId) {
    return Response.json({ error: "missing record id" }, { status: 400 });
  }

  // Re-fetch the message by id instead of trusting the webhook payload's
  // body/created_by/group_id verbatim - this endpoint verifies a caller's
  // JWT but not that the caller *is* the internal pg_net trigger, so a
  // forged request with a crafted payload could otherwise send a push
  // notification with spoofed sender/content to a real group's members
  // without a matching chat_messages row ever existing.
  const { data: message } = await supabase
    .from("chat_messages")
    .select("id, body, created_by, group_id")
    .eq("id", recordId)
    .single();

  if (!message) {
    return Response.json({ error: "message not found" }, { status: 404 });
  }

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
