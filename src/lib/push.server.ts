import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VAPID_PUBLIC =
  "BGM9WdbjzdvpMoOIl8cOfKHT6rU8S2dRf_f9nxj765jwYV-sx08k4gQ9em0guh0iPBYz7pzmLkbZRYia4PuyP3g";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:reminders@wasl.app";
  if (!privateKey) {
    console.error("VAPID_PRIVATE_KEY missing");
    return { sent: 0, removed: 0 };
  }

  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return { sent: 0, removed: 0 };

  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    const sub: PushSubscription = {
      endpoint: s.endpoint,
      expirationTime: null,
      keys: { p256dh: s.p256dh, auth: s.auth },
    };
    try {
      const message = await buildPushPayload(
        { data: payload, options: { ttl: 60 * 60 * 24, urgency: "normal" } },
        sub,
        { subject, publicKey: VAPID_PUBLIC, privateKey },
      );
      const res = await fetch(sub.endpoint, {
        method: message.method,
        headers: message.headers,
        body: new Uint8Array(message.body) as unknown as BodyInit,
      });
      if (res.status === 404 || res.status === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
        removed++;
      } else if (res.ok || res.status === 201) {
        sent++;
      } else {
        console.error("push failed", res.status, await res.text().catch(() => ""));
      }
    } catch (e) {
      console.error("push error", e);
    }
  }
  return { sent, removed };
}
