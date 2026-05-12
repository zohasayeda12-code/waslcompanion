import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendPushToUser } from "@/lib/push.server";

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

  let dispatched = 0;
  for (const it of due ?? []) {
    const url = `/ayah/${it.surah}/${it.ayah}?from=notification`;
    const body = it.text.length > 140 ? `${it.text.slice(0, 137)}…` : it.text;
    try {
      await sendPushToUser(it.user_id, {
        title: `Niyyah · ${it.surah}:${it.ayah}`,
        body,
        url,
        tag: `intention-${it.id}`,
      });
      await supabaseAdmin
        .from("intentions")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", it.id);
      dispatched++;
    } catch (e) {
      console.error("dispatch failed", it.id, e);
    }
  }
  return { dispatched, scanned: due?.length ?? 0 };
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
