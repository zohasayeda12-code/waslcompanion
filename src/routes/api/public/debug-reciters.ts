import { createFileRoute } from "@tanstack/react-router";
import { qfConfig } from "@/lib/qf-config.server";

export const Route = createFileRoute("/api/public/debug-reciters")({
  server: {
    handlers: {
      GET: async () => {
        const id = qfConfig.clientId;
        const secret = qfConfig.clientSecret;
        const basic = Buffer.from(`${id}:${secret}`).toString("base64");
        const tokRes = await fetch("https://prelive-oauth2.quran.foundation/oauth2/token", {
          method: "POST",
          headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ grant_type: "client_credentials", scope: "content" }),
        });
        const tok = (await tokRes.json()) as any;
        const res = await fetch("https://apis-prelive.quran.foundation/content/api/v4/resources/recitations?language=en", {
          headers: { "x-auth-token": tok.access_token, "x-client-id": id, Accept: "application/json" },
        });
        const body = await res.text();
        return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
