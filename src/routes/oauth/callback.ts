import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { qfConfig, getRedirectUri } from "@/lib/qf-config.server";
import { getWaslSession } from "@/lib/qf-session.server";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

/**
 * GET /api/auth/callback
 *  - Validates state against the cookie set in /api/auth/login
 *  - Exchanges the auth code (+ PKCE verifier) for tokens
 *  - Persists tokens in an encrypted session cookie
 *  - 302s to the original redirect target
 */
export const Route = createFileRoute("/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        console.log("STEP 1: callback route hit");

        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        console.log("STEP 2: query params parsed");

        const cookieRaw = getCookie("wasl_oauth");
        deleteCookie("wasl_oauth", { path: "/" });

        const redirectTo = (path: string) =>
          new Response(null, { status: 302, headers: { Location: new URL(path, url.origin).toString() } });

        const fail = (reason: string) =>
          redirectTo(`/login?error=${encodeURIComponent(reason)}`);

        if (error) return fail(errorDescription ?? error);
        if (!code || !state || !cookieRaw) return fail("invalid_callback");

        let parsed: { state: string; verifier: string; redirect: string };
        try {
          parsed = JSON.parse(cookieRaw);
        } catch {
          return fail("invalid_state");
        }

        if (parsed.state !== state) return fail("state_mismatch");

        console.log("STEP 3: state validated");

        const redirectUri = getRedirectUri(url.origin);
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: qfConfig.clientId,
          code_verifier: parsed.verifier,
        });

        // Confidential client: send secret via HTTP Basic auth.
        const basic = Buffer.from(`${qfConfig.clientId}:${qfConfig.clientSecret}`).toString("base64");

        let tokenRes: Response;

        try {
          console.log("STEP 4: token exchange starting");

          tokenRes = await fetch(qfConfig.tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${basic}`,
              Accept: "application/json",
            },
            body: body.toString(),
          });
        } catch (e) {
          console.error("QF token endpoint unreachable", e);
          return fail("token_endpoint_unreachable");
        }

        console.log("STEP 5: token exchange request completed");

        if (!tokenRes.ok) {
          const txt = await tokenRes.text();

          console.error("QF token exchange failed", tokenRes.status, txt.slice(0, 400));

          return fail(`token_exchange_${tokenRes.status}`);
        }

        const tok = (await tokenRes.json()) as TokenResponse;

        console.log("STEP 6: token JSON parsed");

        if (!tok.access_token) return fail("no_access_token");

        console.log("STEP 7: access token exists");

        console.log("STEP 8: session init starting");

        const session = await getWaslSession();

        await session.update({
          accessToken: tok.access_token,
          refreshToken: tok.refresh_token,
          tokenType: tok.token_type ?? "Bearer",
          expiresAt: tok.expires_in ? Date.now() + tok.expires_in * 1000 : undefined,
        });

        console.log("STEP 9: session update success");

        const target = parsed.redirect?.startsWith("/") ? parsed.redirect : "/home";

        console.log("STEP 10: redirecting to app");

        return Response.redirect(new URL(target, url.origin), 302);
      },
    },
  },
});
