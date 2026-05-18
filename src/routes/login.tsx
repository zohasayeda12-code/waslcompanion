import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthSplash } from "@/components/auth-splash";
import { getAuthStatus } from "@/lib/auth.functions";

type LoginSearch = {
  redirect?: string;
  error?: string;
  configured?: boolean;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/")
        ? search.redirect
        : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    configured:
      typeof search.configured === "boolean" ? search.configured : undefined,
  }),
  /**
   * If already authenticated, skip the login screen entirely.
   * Runs on server + client — eliminates flicker for returning users.
   */
  beforeLoad: async ({ search }) => {
    const status = await getAuthStatus();
    if (status.isAuthenticated) {
      throw redirect({ to: search.redirect ?? "/home" });
    }
    return { configured: status.configured };
  },
  head: () => ({
    meta: [
      { title: "Sign in — Wasl" },
      {
        name: "description",
        content: "Sign in with Quran.Foundation to begin your Wasl journey.",
      },
    ],
  }),
  component: LoginScreen,
});

function prettyError(code: string): string {
  switch (code) {
    case "invalid_callback":
      return "The sign-in link was incomplete. Please try again.";
    case "invalid_state":
    case "state_mismatch":
      return "Your sign-in session expired. Please try again.";
    case "token_endpoint_unreachable":
      return "We couldn't reach Quran.Foundation. Check your connection and try again.";
    case "no_access_token":
      return "Quran.Foundation didn't return a token. Please try again.";
    default:
      if (code.startsWith("token_exchange_")) {
        return "Quran.Foundation rejected the sign-in. Please try again.";
      }
      return decodeURIComponent(code);
  }
}

function LoginScreen() {
  const { redirect: redirectParam, error } = Route.useSearch();
  const { configured } = Route.useRouteContext();
  const [redirecting, setRedirecting] = useState(false);

  const loginHref =
    "/api/auth/login" +
    (redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : "");

  if (redirecting) {
    return <AuthSplash message="Taking you to Quran.Foundation…" />;
  }

  return (
    <AppShell framed={false}>
      <Link
        to="/"
        className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 flex flex-1 flex-col items-center text-center md:mt-12"
      >
        {/* Hero orb — softer aurora wash, no harsh primary glow */}
        <div className="relative flex size-24 items-center justify-center">
          <div
            aria-hidden
            className="animate-pulse-slow absolute inset-0 rounded-full opacity-50 blur-2xl"
            style={{
              background: "var(--gradient-aurora)",
              animationDuration: "8s",
            }}
          />
          <div
            className="relative flex size-16 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md"
            style={{
              boxShadow:
                "inset 0 1px 0 oklch(1 0 0 / 0.10), 0 8px 30px oklch(0 0 0 / 0.35)",
            }}
          >
            <svg
              viewBox="0 0 64 64"
              className="size-8"
              fill="none"
              stroke="oklch(0.88 0.12 82)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M48 32a18 18 0 1 1-18-18 14 14 0 0 0 18 18z" />
            </svg>
          </div>
        </div>

        <h1 className="mt-8 text-[clamp(1.9rem,6.5vw,2.5rem)] font-medium tracking-tight">
          Welcome back to <span className="text-aurora">Wasl</span>
        </h1>
        <p className="mt-3 max-w-sm text-balance text-muted-foreground">
          Continue your journey with Quran.Foundation — your bookmarks,
          reflections and pace travel with you.
        </p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 w-full max-w-sm rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {prettyError(error)}
          </motion.div>
        )}

        {configured === false ? (
          <NotConfigured />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex w-full max-w-[18rem] flex-col gap-3"
          >
            <a
              href={loginHref}
              onClick={() => setRedirecting(true)}
              className="group relative isolate inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-[15px] font-medium tracking-tight text-foreground backdrop-blur-md transition-all duration-200 ease-[var(--ease-spring)] hover:bg-white/[0.07] active:scale-[0.97]"
              style={{
                boxShadow:
                  "inset 0 1px 0 oklch(1 0 0 / 0.08), 0 6px 24px oklch(0.74 0.13 168 / 0.14)",
              }}
            >
              <span className="relative z-10">Continue with Quran.Foundation</span>
              <svg
                viewBox="0 0 24 24"
                className="relative z-10 size-4 opacity-70 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
            <p className="px-1 text-center text-xs text-muted-foreground">
              A quiet, secure handoff. Wasl never sees your password.
            </p>
          </motion.div>
        )}
      </motion.div>

      <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
        New here?{" "}
        <a
          href="https://quran.foundation"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[color:var(--gold)] hover:underline"
        >
          Create a Quran.Foundation account
        </a>
      </p>
    </AppShell>
  );
}

function NotConfigured() {
  return (
    <div className="glass mt-10 rounded-2xl p-5 text-sm">
      <p className="font-medium text-foreground">Setup required</p>
      <p className="mt-2 text-muted-foreground">
        Quran.Foundation OAuth credentials are not yet configured on this
        deployment. Once <code className="text-foreground">QF_CLIENT_ID</code>,{" "}
        <code className="text-foreground">QF_CLIENT_SECRET</code>, and{" "}
        <code className="text-foreground">SESSION_SECRET</code> are set, sign-in
        will be available here.
      </p>
    </div>
  );
}
