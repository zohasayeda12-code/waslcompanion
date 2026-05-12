import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushToUser } from "@/lib/push.server";

async function logAttempt(args: {
  intentionId: string;
  userId: string;
  status: "sent" | "failed" | "skipped" | "partial";
  failureReason?: string | null;
  details: Record<string, unknown>;
}) {
  await supabaseAdmin.from("notification_log").insert({
    intention_id: args.intentionId,
    user_id: args.userId,
    status: args.status,
    failure_reason: args.failureReason ?? null,
    sent_at: args.status === "sent" || args.status === "partial" ? new Date().toISOString() : null,
    delivery_details: args.details as never,
  });
}

async function run() {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("intentions")
    .select("id, user_id, surah, ayah, text, reminder_at, status")
    .lte("reminder_at", nowIso)
    .is("reminder_sent_at", null)
    .in("status", ["pending", "carried", "awaiting_response"])
    .limit(200);

  if (error) return { error: error.message };

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const scanned = due?.length ?? 0;

  for (const it of due ?? []) {
    const url = `/ayah/${it.surah}/${it.ayah}?from=notification`;
    const body = it.text.length > 140 ? `${it.text.slice(0, 137)}…` : it.text;

    let result;
    try {
      result = await sendPushToUser(it.user_id, {
        title: `Niyyah · ${it.surah}:${it.ayah}`,
        body,
        url,
        tag: `intention-${it.id}`,
      });
    } catch (e) {
      const reason = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      failed++;
      await logAttempt({
        intentionId: it.id,
        userId: it.user_id,
        status: "failed",
        failureReason: `unexpected error: ${reason}`,
        details: { error: reason },
      });
      continue;
    }

    if (result.sent > 0) {
      // At least one device was successfully delivered — mark sent.
      sent++;
      await supabaseAdmin
        .from("intentions")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", it.id);
      await logAttempt({
        intentionId: it.id,
        userId: it.user_id,
        status: result.failed > 0 ? "partial" : "sent",
        failureReason: result.failed > 0 ? "one or more device pushes failed" : null,
        details: { attempts: result.attempts, sent: result.sent, failed: result.failed, removed: result.removed },
      });
    } else if (result.attempts.length === 0) {
      // No subscriptions or VAPID misconfigured — do NOT stamp reminder_sent_at;
      // leave the row eligible so it dispatches as soon as the user subscribes.
      skipped++;
      await logAttempt({
        intentionId: it.id,
        userId: it.user_id,
        status: "skipped",
        failureReason: result.reason ?? "no delivery attempt made",
        details: { reason: result.reason ?? null },
      });
    } else {
      // All attempts failed — leave reminder_sent_at null so the next cron tick retries.
      failed++;
      const firstFailReason = result.attempts.find((a) => a.status === "failed")?.reason ?? "all push attempts failed";
      await logAttempt({
        intentionId: it.id,
        userId: it.user_id,
        status: "failed",
        failureReason: firstFailReason,
        details: { attempts: result.attempts, removed: result.removed },
      });
    }
  }

  return { scanned, sent, failed, skipped };
}

export const Route = createFileRoute("/api/public/cron/reminders")({
  server: {
    handlers: {
      POST: async () => {
        const r = await run();
        return new Response(JSON.stringify(r), { headers: { "content-type": "application/json" } });
      },
      GET: async () => {
        const r = await run();
        return new Response(JSON.stringify(r), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
