import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import {
  qfConfig,
  getRedirectUri,
  isConfigured,
} from "@/lib/qf-config.server";
import {
  generateVerifier,
  generateState,
  challengeFromVerifier,
} from "@/lib/pkce.server";

/**
 * GET /api/auth/login
 *  - Generates PKCE verifier + state
 *  - Stores them in a short-lived httpOnly cookie
 *  - 302s the browser to Quran.Foundation's authorize endpoint
 */
export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isConfigured()) {
          return new Response(
            "Quran.Foundation OAuth is not configured on the server. " +
              "Missing one of QF_CLIENT_ID, QF_CLIENT_SECRET, or SESSION_SECRET.",
            { status: 500 },
          );
        }

        const url = new URL(request.url);
        const redirectAfter = url.searchParams.get("redirect") ?? "/home";
        const safeRedirect = redirectAfter.startsWith("/")
          ? redirectAfter
          : "/home";

        const state = generateState();
        const verifier = generateVerifier();
        const challenge = challengeFromVerifier(verifier);

        setCookie(
          "wasl_oauth",
          JSON.stringify({ state, verifier, redirect: safeRedirect }),
          {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 600, // 10 minutes — enough to complete the OAuth dance
          },
        );

        const redirectUri = getRedirectUri(url.origin);
        const authorize = new URL(qfConfig.authUrl);
        authorize.searchParams.set("response_type", "code");
        authorize.searchParams.set("client_id", qfConfig.clientId);
        authorize.searchParams.set("redirect_uri", redirectUri);
        authorize.searchParams.set("scope", qfConfig.scopes);
        authorize.searchParams.set("state", state);
        authorize.searchParams.set("code_challenge", challenge);
        authorize.searchParams.set("code_challenge_method", "S256");

        return new Response(null, {
          status: 302,
          headers: { Location: authorize.toString() },
        });
      },
    },
  },
});
