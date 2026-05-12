import { motion } from "motion/react";

/**
 * Calm full-screen splash shown during auth transitions
 * (clicking Sign in, redirecting to/from Quran.Foundation).
 */
export function AuthSplash({ message = "One quiet moment…" }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-16 items-center justify-center rounded-3xl bg-[var(--gradient-primary)] shadow-[var(--shadow-elevated)]"
      >
        <svg
          viewBox="0 0 64 64"
          className="size-9"
          fill="none"
          stroke="oklch(0.88 0.12 82)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M48 32a18 18 0 1 1-18-18 14 14 0 0 0 18 18z" />
        </svg>
      </motion.div>
      <p className="mt-6 text-sm text-muted-foreground">{message}</p>
    </motion.div>
  );
}
