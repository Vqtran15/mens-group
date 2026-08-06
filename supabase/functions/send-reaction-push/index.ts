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

  // Re-fetch the reaction by id instead of trusting the webhook payload's
  // fields verbatim - same reasoning as send-chat-push: this endpoint
  // verifies a caller's JWT but not that the caller *is* the internal
  // pg_net trigger.
  const { data: reaction } = await supabase
    .from("message_reactions")
    .select("id, emoji, user_id, message_id")
    .eq("id", recordId)
    .single();

  if (!reaction) {
    return Response.json({ error: "reaction not found" }, { status: 404 });
  }

  // message_reactions has no owner column of its own - the message owner
  // (who should be notified) comes from the chat_messages row it points at.
  const { data: message } = await supabase
    .from("chat_messages")
    .select("id, created_by")
    .eq("id", reaction.message_id)
    .single();

  if (!message) {
    return Response.json({ error: "message not found" }, { status: 404 });
  }

  if (reaction.user_id === message.created_by) {
    return Response.json({ skipped: "self-reaction" });
  }

  const { data: reactor } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", reaction.user_id)
    .single();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", message.created_by);

  const notification = JSON.stringify({
    title: reactor?.display_name ?? "Men's Group",
    body: `reacted ${reaction.emoji} to your message`,
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
