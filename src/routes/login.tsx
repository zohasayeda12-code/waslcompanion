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
    <AppShell>
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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 flex flex-1 flex-col md:mt-12"
      >
        {/* Hero orb with concentric aurora rings */}
        <div className="relative flex size-24 items-center justify-center">
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse-slow rounded-full opacity-70 blur-2xl"
            style={{ background: "var(--gradient-aurora)" }}
          />
          <div
            className="relative flex size-16 items-center justify-center rounded-3xl"
            style={{
              background: "var(--gradient-primary)",
              boxShadow: "var(--shadow-glow-primary)",
            }}
          >
            <svg
              viewBox="0 0 64 64"
              className="size-8"
              fill="none"
              stroke="oklch(0.95 0.10 82)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M48 32a18 18 0 1 1-18-18 14 14 0 0 0 18 18z" />
            </svg>
          </div>
        </div>

        <h1 className="mt-8 text-[clamp(2rem,7vw,2.75rem)] font-medium tracking-tight">
          Welcome to <span className="text-aurora">Wasl</span>
        </h1>
        <p className="mt-3 max-w-sm text-balance text-muted-foreground">
          Sign in with your Quran.Foundation account to keep your bookmarks,
          reflections and journey in sync.
        </p>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {prettyError(error)}
          </motion.div>
        )}

        {configured === false ? (
          <NotConfigured />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-col gap-3"
          >
            <a
              href={loginHref}
              onClick={() => setRedirecting(true)}
              className="group relative isolate inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-medium tracking-tight text-primary-foreground transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.97] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:[background:linear-gradient(180deg,oklch(1_0_0_/_0.18),transparent_55%)]"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: "var(--shadow-glow-primary)",
              }}
            >
              <span className="relative z-10">Sign in with Quran.Foundation</span>
              <svg
                viewBox="0 0 24 24"
                className="relative z-10 size-4"
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
              You'll be redirected securely. Wasl never sees your password.
            </p>
          </motion.div>
        )}
      </motion.div>

      <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
        New to Quran.Foundation?{" "}
        <a
          href="https://quran.foundation"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[color:var(--gold)] hover:underline"
        >
          Create an account
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
