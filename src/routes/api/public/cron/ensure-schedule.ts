import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const JOB_NAME = "wasl-reminders-every-minute";

function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

function checkApiKey(request: Request): boolean {
  const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!expected) return false;
  const provided =
    request.headers.get("apikey") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return provided === expected;
}

async function ensureSchedule(request: Request) {
  // Derive the cron target URL from the request itself, so it always points
  // to the deployment currently serving traffic — survives remixes/renames
  // without any hard-coded project ID.
  const url = new URL(request.url);
  const targetUrl = `${url.origin}/api/public/cron/reminders`;
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "SUPABASE_PUBLISHABLE_KEY missing on server" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  // The DB function is installed by migration. It unschedules any existing
  // job with the same name and reschedules pointing at target_url.
  const { data, error } = await (supabaseAdmin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    "wasl_ensure_reminder_schedule",
    { target_url: targetUrl, api_key: apiKey },
  );

  if (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message,
        hint:
          "wasl_ensure_reminder_schedule() missing — run the bootstrap migration.",
      }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, jobName: JOB_NAME, targetUrl, result: data }),
    { headers: { "content-type": "application/json" } },
  );
}

export const Route = createFileRoute("/api/public/cron/ensure-schedule")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!checkApiKey(request)) return unauthorized();
        return ensureSchedule(request);
      },
      POST: async ({ request }) => {
        if (!checkApiKey(request)) return unauthorized();
        return ensureSchedule(request);
      },
    },
  },
});
