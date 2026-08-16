// Real web push sender — called only by our own database trigger the
// instant a new order or a new delivery assignment happens. Not a public
// endpoint: verify_jwt is off because this is invoked server-to-server by
// pg_net (which can't attach a user JWT), so a shared secret header does
// the same job — only our own trigger knows it.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const WEBHOOK_SECRET = "b88f46ff6ef42478b20e7b1687fbfc871297926c1ad966b9";
const VAPID_PUBLIC_KEY = "BN3SE_akCTIbWXSNMRK6QG1Incq5UCOFj1lmc0WnJHMRKVSnQB7Wm9okEjxYFWSaEmkfgFSoTc7KjQeakNW7LVM";
const VAPID_PRIVATE_KEY = "cHpny3GXHmyPqRh7Sh5y2tTFAT9rCxyf0qTsRPS0teo";

webpush.setVapidDetails("mailto:support@umc-bck.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { user_id, title, body, url } = await req.json();
  if (!user_id || !title) {
    return new Response(JSON.stringify({ error: "user_id and title are required" }), { status: 400 });
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!subs || subs.length === 0) {
    // Genuinely normal — this user just hasn't turned on notifications.
    return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), { status: 200 });
  }

  const payload = JSON.stringify({ title, body: body || "", url: url || "/" });
  let sent = 0;
  const deadEndpointIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // 404/410 means the browser genuinely revoked this subscription
        // (uninstalled, permissions cleared, etc) — real cleanup, not a
        // silent failure left to rot.
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          deadEndpointIds.push(sub.id);
        }
      }
    }),
  );

  if (deadEndpointIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", deadEndpointIds);
  }

  return new Response(JSON.stringify({ sent, removed: deadEndpointIds.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
