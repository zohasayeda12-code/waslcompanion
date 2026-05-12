import { motion } from "motion/react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * AppShell — responsive container that frames every Wasl screen.
 * On mobile: full-width calm canvas.
 * On tablet/desktop: a centered "phone-like" surface, with breathing room.
 */
export function AppShell({ children, className = "" }: Props) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden">
      {/* Ambient decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, oklch(0.92 0.05 95 / 0.7), transparent 70%)",
        }}
      />

      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={
          "relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pb-10 pt-[max(env(safe-area-inset-top),1.5rem)] " +
          "sm:max-w-lg sm:px-8 " +
          "md:max-w-2xl md:px-10 md:pt-12 " +
          "lg:max-w-3xl " +
          className
        }
      >
        {children}
      </motion.main>
    </div>
  );
}
