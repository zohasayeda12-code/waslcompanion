import { createFileRoute, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AuthSplash } from "@/components/auth-splash";
import { getAuthStatus } from "@/lib/auth.functions";

type IndexSearch = {
  redirect?: string;
  error?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/")
        ? search.redirect
        : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const status = await getAuthStatus();
    if (status.isAuthenticated) {
      throw redirect({ to: search.redirect ?? "/home" });
    }
    return { configured: status.configured };
  },
  head: () => ({
    meta: [
      { title: "Wasl — Read. Understand. Live the Ayah." },
      {
        name: "description",
        content:
          "Begin a calm journey with the Quran. Read, reflect, and live the Ayah.",
      },
    ],
  }),
  component: OnboardingScreen,
});

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

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

function OnboardingScreen() {
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
    <AppShell framed={false} className="justify-between">
      {/* Ultra-subtle ambient noise — almost imperceptible film grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[5] opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
        }}
      />

      <header className="flex items-center justify-between pt-2">
        <span className="text-[11px] font-medium tracking-[0.32em] text-muted-foreground/60 uppercase">
          Wasl
        </span>
        <span
          aria-hidden
          className="inline-block size-1.5 rounded-full bg-[color:var(--gold)]/70"
        />
      </header>

      <section className="mx-auto flex w-full max-w-[44rem] flex-1 flex-col items-center justify-center text-center md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-10"
        >
          <div
            aria-hidden
            className="animate-pulse-slow absolute inset-0 -z-10 blur-2xl opacity-70"
            style={{
              background:
                "radial-gradient(circle, oklch(0.85 0.08 82 / 0.22), transparent 70%)",
              animationDuration: "8s",
            }}
          />
          <div className="flex size-24 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md md:size-28"
            style={{
              boxShadow:
                "inset 0 1px 0 oklch(1 0 0 / 0.08), 0 8px 30px oklch(0 0 0 / 0.35)",
            }}
          >
            <svg
              viewBox="0 0 64 64"
              className="size-12 md:size-14"
              fill="none"
              stroke="oklch(0.88 0.12 82)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M48 32a18 18 0 1 1-18-18 14 14 0 0 0 18 18z" />
            </svg>
          </div>
        </motion.div>

        <motion.h1
          {...fade}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4 text-4xl leading-[1.08] font-medium tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          Read. Understand.
          <br />
          <span className="italic text-primary">Live the Ayah.</span>
        </motion.h1>

        <motion.p
          {...fade}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 max-w-md text-balance text-base leading-relaxed text-muted-foreground md:mt-12 md:text-lg"
        >
          A calm companion for your daily journey with the Quran — gentle,
          focused, and made to feel close.
        </motion.p>

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
      </section>

      <motion.footer
        {...fade}
        transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
        {configured === false ? (
          <NotConfigured />
        ) : (
          <>
            <a
              href={loginHref}
              onClick={() => setRedirecting(true)}
              className="group relative isolate inline-flex h-16 w-full max-w-[22rem] items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-8 py-4 text-base font-medium tracking-tight text-foreground backdrop-blur-md transition-all duration-200 ease-[var(--ease-spring)] hover:bg-white/[0.07] active:scale-[0.97]"
              style={{
                boxShadow:
                  "inset 0 1px 0 oklch(1 0 0 / 0.08), 0 6px 24px oklch(0.74 0.13 168 / 0.14)",
              }}
            >
              <span className="relative z-10">Continue with Quran.Foundation</span>
              <svg
                viewBox="0 0 24 24"
                className="relative z-10 size-[18px] opacity-70 transition-transform group-hover:translate-x-0.5"
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
            <p className="text-center text-xs text-muted-foreground">
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
          </>
        )}
      </motion.footer>
    </AppShell>
  );
}

function NotConfigured() {
  return (
    <div className="glass mt-2 w-full max-w-sm rounded-2xl p-5 text-sm">
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
