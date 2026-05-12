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
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        const cookieRaw = getCookie("wasl_oauth");
        deleteCookie("wasl_oauth", { path: "/" });

        const fail = (reason: string) =>
          Response.redirect(
            new URL(`/login?error=${encodeURIComponent(reason)}`, url.origin),
            302,
          );

        if (error) return fail(errorDescription ?? error);
        if (!code || !state || !cookieRaw) return fail("invalid_callback");

        let parsed: { state: string; verifier: string; redirect: string };
        try {
          parsed = JSON.parse(cookieRaw);
        } catch {
          return fail("invalid_state");
        }
        if (parsed.state !== state) return fail("state_mismatch");

        const redirectUri = getRedirectUri(url.origin);
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: qfConfig.clientId,
          code_verifier: parsed.verifier,
        });

        // Confidential client: send secret via HTTP Basic auth.
        const basic = Buffer.from(
          `${qfConfig.clientId}:${qfConfig.clientSecret}`,
        ).toString("base64");

        let tokenRes: Response;
        try {
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

        if (!tokenRes.ok) {
          const txt = await tokenRes.text();
          console.error(
            "QF token exchange failed",
            tokenRes.status,
            txt.slice(0, 400),
          );
          return fail(`token_exchange_${tokenRes.status}`);
        }

        const tok = (await tokenRes.json()) as TokenResponse;
        if (!tok.access_token) return fail("no_access_token");

        const session = await getWaslSession();
        await session.update({
          accessToken: tok.access_token,
          refreshToken: tok.refresh_token,
          tokenType: tok.token_type ?? "Bearer",
          expiresAt: tok.expires_in
            ? Date.now() + tok.expires_in * 1000
            : undefined,
        });

        const target = parsed.redirect?.startsWith("/")
          ? parsed.redirect
          : "/home";
        return Response.redirect(new URL(target, url.origin), 302);
      },
    },
  },
});
