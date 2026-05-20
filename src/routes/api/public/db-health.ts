import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Temporary diagnostic — proves the DB is reachable and lists row counts.
export const Route = createFileRoute("/api/public/db-health")({
  server: {
    handlers: {
      GET: async () => {
        const tables = [
          "profiles",
          "journey_state",
          "highlights",
          "intentions",
          "bookmarks_local",
          "collections_local",
          "push_subscriptions",
        ];
        const results: Record<string, number | string> = {};
        for (const t of tables) {
          const { count, error } = await supabaseAdmin
            .from(t as never)
            .select("*", { count: "exact", head: true });
          results[t] = error ? `ERR: ${error.message}` : (count ?? 0);
        }
        return Response.json({ ok: true, tables: results });
      },
    },
  },
});
