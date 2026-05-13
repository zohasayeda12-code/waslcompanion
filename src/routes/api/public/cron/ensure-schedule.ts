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
  // to the deployment that's currently serving traffic — no hard-coded
  // project ID, survives remixes and renames.
  const url = new URL(request.url);
  const targetUrl = `${url.origin}/api/public/cron/reminders`;
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";

  // Idempotent: try to unschedule (ignore "not found"), then re-schedule.
  // Using supabaseAdmin's RPC isn't available for raw SQL, so we use the
  // pg_net + cron tables via a single SQL roundtrip through a postgres
  // function. The simplest portable path: invoke via supabaseAdmin.rpc on a
  // helper, OR run via the SQL editor. Here we use the `query` REST endpoint
  // — but supabase-js doesn't expose raw SQL. So we use the admin client to
  // call a one-shot function we ensure inline through pg_net is overkill.
  //
  // Practical approach: use supabaseAdmin to invoke the postgres `cron` API
  // via a security-definer helper we install on first call.
  const installSql = `
    create or replace function public._wasl_ensure_reminder_schedule(
      target_url text,
      api_key text
    ) returns void
    language plpgsql
    security definer
    set search_path = public, cron
    as $fn$
    begin
      perform cron.unschedule('${JOB_NAME}');
    exception when others then
      null;
    end;
    $fn$;
  `;

  // We cannot run raw DDL via supabase-js. Instead, the migration system is
  // the right tool for installing the helper. For runtime self-healing we
  // call a pre-existing helper. If it doesn't exist, return guidance.
  //
  // Strategy: call cron.schedule directly via PostgREST is not possible, but
  // we CAN invoke a stored function. Install the helper via migration once;
  // the route just calls it.
  void installSql;

  const { data, error } = await supabaseAdmin.rpc("wasl_ensure_reminder_schedule", {
    target_url: targetUrl,
    api_key: apiKey,
  });

  if (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message,
        hint:
          "The wasl_ensure_reminder_schedule() database function is missing. Run the bootstrap migration.",
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
