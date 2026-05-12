import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AppShell } from "@/components/app-shell";
import { PrimaryLink } from "@/components/primary-button";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Wasl" },
      { name: "description", content: "Sign in to your Wasl companion." },
    ],
  }),
  component: LoginScreen,
});

function LoginScreen() {
  return (
    <AppShell>
      <Link
        to="/"
        className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 md:mt-16"
      >
        <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
          Welcome back
        </h1>
        <p className="mt-3 max-w-sm text-muted-foreground">
          Sign in to continue your quiet journey with the Quran.
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={(e) => e.preventDefault()}
        className="mt-10 flex flex-col gap-4"
      >
        <Field label="Email" type="email" placeholder="you@example.com" autoComplete="email" />
        <Field label="Password" type="password" placeholder="••••••••" autoComplete="current-password" />

        <div className="mt-2">
          <PrimaryLink to="/home">Sign in</PrimaryLink>
        </div>

        <div className="my-2 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-border bg-card text-base font-medium text-foreground shadow-[var(--shadow-soft)] transition-all hover:bg-secondary/60 active:scale-[0.985]"
        >
          Continue with Google
        </button>
      </motion.form>

      <p className="mt-auto pt-10 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link to="/" className="font-medium text-primary hover:underline">
          Start onboarding
        </Link>
      </p>
    </AppShell>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-sm font-medium text-foreground/80">{label}</span>
      <input
        {...rest}
        className="h-14 w-full rounded-2xl border border-input bg-card px-5 text-base text-foreground placeholder:text-muted-foreground/70 shadow-[var(--shadow-soft)] outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}
