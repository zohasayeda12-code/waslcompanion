import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VAPID_PUBLIC =
  "BBwyIvizd0SsaJOMhIZErZK-hGORHKXZYF5pKo8vo4HI04DYjOd3Sm72D3ewQ5Ijbf_Cw1qRhqw_5jG8N_wyHVU";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export type PushAttempt = {
  subscriptionId: string;
  status: "sent" | "removed" | "failed" | "skipped";
  httpStatus?: number;
  reason?: string;
};

export type PushResult = {
  sent: number;
  removed: number;
  failed: number;
  attempts: PushAttempt[];
  reason?: string;
};

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:reminders@wasl.app";
  if (!privateKey) {
    return { sent: 0, removed: 0, failed: 0, attempts: [], reason: "VAPID_PRIVATE_KEY missing" };
  }

  const { data: subs, error: subsError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (subsError) {
    return { sent: 0, removed: 0, failed: 0, attempts: [], reason: `subscription lookup failed: ${subsError.message}` };
  }
  if (!subs || subs.length === 0) {
    return { sent: 0, removed: 0, failed: 0, attempts: [], reason: "no push subscriptions for user" };
  }

  const attempts: PushAttempt[] = [];
  let sent = 0;
  let removed = 0;
  let failed = 0;

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
        attempts.push({
          subscriptionId: s.id,
          status: "removed",
          httpStatus: res.status,
          reason: "subscription expired or unsubscribed (deleted)",
        });
      } else if (res.ok || res.status === 201) {
        sent++;
        attempts.push({ subscriptionId: s.id, status: "sent", httpStatus: res.status });
      } else {
        const text = await res.text().catch(() => "");
        failed++;
        attempts.push({
          subscriptionId: s.id,
          status: "failed",
          httpStatus: res.status,
          reason: `push provider HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`,
        });
      }
    } catch (e) {
      failed++;
      attempts.push({
        subscriptionId: s.id,
        status: "failed",
        reason: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      });
    }
  }
  return { sent, removed, failed, attempts };
}
