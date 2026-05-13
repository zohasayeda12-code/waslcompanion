// TEMP one-shot route: installs the pg_cron schedule using server-side
// CRON_SECRET. Safe to call: it only (re)schedules an idempotent job and
// returns no secret material. Delete after first successful run.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushToUser } from "@/lib/push.server";

async function flushOverdue() {
  const nowIso = new Date().toISOString();
  const { data: due } = await supabaseAdmin
    .from("intentions")
    .select("id, user_id, surah, ayah, text, reminder_at")
    .lte("reminder_at", nowIso)
    .is("reminder_sent_at", null)
    .in("status", ["pending", "carried", "awaiting_response"])
    .limit(50);

  const results: Array<{ id: string; sent: number; failed: number; reason?: string }> = [];
  for (const it of due ?? []) {
    const body = it.text.length > 140 ? `${it.text.slice(0, 137)}…` : it.text;
    const r = await sendPushToUser(it.user_id, {
      title: `Niyyah · ${it.surah}:${it.ayah}`,
      body,
      url: `/ayah/${it.surah}/${it.ayah}?from=notification`,
      tag: `intention-${it.id}-${new Date(it.reminder_at!).getTime()}`,
    });
    if (r.sent > 0) {
      await supabaseAdmin
        .from("intentions")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", it.id);
    }
    results.push({ id: it.id, sent: r.sent, failed: r.failed, reason: r.reason });
  }
  return results;
}

export const Route = createFileRoute("/api/public/cron/bootstrap-once")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apiKey = process.env.CRON_SECRET ?? "";
        if (!apiKey) {
          return Response.json({ ok: false, error: "CRON_SECRET missing" }, { status: 500 });
        }
        const url = new URL(request.url);
        const targetUrl = `${url.origin}/api/public/cron/reminders`;

        const { data, error } = await (supabaseAdmin.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>)(
          "wasl_ensure_reminder_schedule",
          { target_url: targetUrl, api_key: apiKey },
        );
        if (error) return Response.json({ ok: false, step: "schedule", error: error.message }, { status: 500 });

        const flushed = await flushOverdue();
        return Response.json({ ok: true, scheduled: data, flushed });
      },
    },
  },
});
