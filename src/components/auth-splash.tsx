import { motion } from "motion/react";

/**
 * Calm full-screen splash shown during auth transitions.
 * Now: a breathing orb wrapped in concentric aurora rings.
 */
export function AuthSplash({ message = "One quiet moment…" }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "var(--gradient-night-canvas)" }}
    >
      <div className="relative flex size-40 items-center justify-center">
        {/* concentric aurora rings */}
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse-slow rounded-full opacity-60 blur-2xl"
          style={{ background: "var(--gradient-aurora)" }}
        />
        <div
          aria-hidden
          className="absolute inset-4 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="absolute inset-8 rounded-full border border-white/5"
        />

        {/* central orb */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex size-16 items-center justify-center rounded-3xl"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-glow-primary)",
          }}
        >
          <svg
            viewBox="0 0 64 64"
            className="size-9"
            fill="none"
            stroke="oklch(0.95 0.10 82)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M48 32a18 18 0 1 1-18-18 14 14 0 0 0 18 18z" />
          </svg>
        </motion.div>
      </div>
      <p className="mt-8 text-sm text-foreground/80">{message}</p>
      <p className="mt-2 text-xs tracking-wide text-muted-foreground">
        Secure sign-in powered by Quran.Foundation
      </p>
    </motion.div>
  );
}
