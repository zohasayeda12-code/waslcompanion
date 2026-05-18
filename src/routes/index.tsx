import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AppShell } from "@/components/app-shell";
import { PrimaryLink } from "@/components/primary-button";

export const Route = createFileRoute("/")({
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

function OnboardingScreen() {
  return (
    <AppShell framed={false} className="justify-between">
      <header className="flex items-center justify-between pt-2">
        <span className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Wasl
        </span>
        <span
          aria-hidden
          className="inline-block size-2 rounded-full bg-[color:var(--gold)]"
        />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center text-center md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-10"
        >
          <div
            aria-hidden
            className="animate-pulse-slow absolute inset-0 -z-10 blur-2xl"
            style={{
              background:
                "radial-gradient(circle, oklch(0.85 0.08 82 / 0.35), transparent 70%)",
              animationDuration: "7s",
            }}
          />
          <div className="flex size-24 items-center justify-center rounded-3xl bg-[var(--gradient-primary)] shadow-[var(--shadow-elevated)] md:size-28">
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
          className="text-4xl leading-[1.1] font-medium tracking-tight text-foreground sm:text-5xl md:text-6xl"
        >
          Read. Understand.
          <br />
          <span className="italic text-primary">Live the Ayah.</span>
        </motion.h1>

        <motion.p
          {...fade}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-md text-balance text-base leading-relaxed text-muted-foreground md:text-lg"
        >
          A calm companion for your daily journey with the Quran — gentle,
          focused, and made to feel close.
        </motion.p>
      </section>

      <motion.footer
        {...fade}
        transition={{ duration: 0.5, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
        <div className="w-full max-w-[17rem]">
          <PrimaryLink
            to="/login"
            className="!shadow-[0_0_0_1px_oklch(0.74_0.13_168_/_0.22),0_6px_22px_oklch(0.74_0.13_168_/_0.18)]"
          >
            Begin your journey
          </PrimaryLink>
        </div>
      </motion.footer>
    </AppShell>
  );
}
