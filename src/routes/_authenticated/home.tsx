import { createFileRoute } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Wasl" },
      { name: "description", content: "Your calm Quran companion home." },
    ],
  }),
  component: HomeScreen,
});

const ease = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
};

function HomeScreen() {
  return (
    <AppShell>
      <motion.header
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex items-center justify-between"
      >
        <motion.div variants={item}>
          <p className="text-sm text-muted-foreground">Assalāmu ʿalaykum</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight md:text-3xl">
            A moment with the Ayah
          </h1>
        </motion.div>
        <motion.form variants={item} method="post" action="/api/auth/logout">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex size-11 items-center justify-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent active:scale-[0.96]"
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </motion.form>
      </motion.header>

      {/* Ayah of the moment */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 overflow-hidden rounded-3xl bg-[var(--gradient-primary)] p-7 text-primary-foreground shadow-[var(--shadow-elevated)] md:p-10"
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-80">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-[color:var(--gold)]"
          />
          Ayah of the day
        </div>
        <p
          className="mt-5 text-2xl leading-relaxed font-medium tracking-tight md:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          “Indeed, with hardship comes ease.”
        </p>
        <p className="mt-4 text-sm opacity-75">Sūrah Ash-Sharḥ · 94:6</p>
      </motion.section>

      {/* Quick paths */}
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4"
      >
        {[
          { label: "Read", hint: "Open the Quran" },
          { label: "Understand", hint: "Reflection" },
          { label: "Live", hint: "Today's practice" },
          { label: "Listen", hint: "Recitation" },
        ].map((c) => (
          <motion.button
            key={c.label}
            variants={item}
            className="group flex aspect-[1.1] flex-col justify-between rounded-3xl border border-border bg-card p-5 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] active:scale-[0.985] md:p-6"
          >
            <span className="size-2 rounded-full bg-[color:var(--gold)] opacity-80 transition-opacity group-hover:opacity-100" />
            <div>
              <p className="text-lg font-medium tracking-tight">{c.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </div>
          </motion.button>
        ))}
      </motion.section>

      {/* Continue */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Continue reading
            </p>
            <p className="mt-2 text-lg font-medium">Sūrah Al-Kahf</p>
            <p className="text-sm text-muted-foreground">Ayah 10 of 110</p>
          </div>
          <button
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:shadow-[var(--shadow-elevated)] active:scale-[0.985]"
            aria-label="Resume reading"
          >
            Resume
          </button>
        </div>
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "9%" }}
            transition={{ duration: 1.2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full bg-[color:var(--gold)]"
          />
        </div>
      </motion.section>

      <div className="h-10" />
    </AppShell>
  );
}
