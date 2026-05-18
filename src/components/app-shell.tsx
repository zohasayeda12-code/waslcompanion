import { motion } from "motion/react";
import type { ReactNode } from "react";
import { AmbientCanvas } from "./ambient-canvas";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** When true (default), wraps content in a centered "device" frame on >=md screens. */
  framed?: boolean;
};

/**
 * AppShell — the responsive container that frames every Wasl screen.
 *
 * Mobile (<768px):  edge-to-edge, safe-area aware, no max-width.
 * Tablet/desktop:   a centered "device" canvas (max 440px) floating in an
 *                   ambient aurora world, with soft outer glow + glass border.
 */
export function AppShell({ children, className = "", framed = true }: Props) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden">
      <AmbientCanvas />

      {/* Outer wrapper: centers the device on tablet+, full bleed on mobile */}
      <div
        className={cn(
          "relative z-[1] flex min-h-[100dvh] w-full justify-center",
          framed ? "md:items-center md:py-10 lg:py-14" : ""
        )}
      >
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            // Mobile: full-bleed phone canvas
            "relative flex w-full flex-col",
            "px-[clamp(1rem,5vw,1.5rem)]",
            "pt-[max(env(safe-area-inset-top),1.25rem)]",
            "pb-[calc(max(env(safe-area-inset-bottom),1rem)+5.5rem)]",
            "min-h-[100dvh]",
            // Tablet/desktop: floating reading canvas. Widens with the
            // viewport so large screens feel intentionally framed rather
            // than a phone trapped in a void — without becoming a dashboard.
            framed && [
              "md:max-w-[640px] lg:max-w-[860px] xl:max-w-[1000px] 2xl:max-w-[1080px]",
              "md:min-h-[min(880px,90dvh)]",
              "md:rounded-[2.25rem]",
              "md:border md:border-white/10",
              "md:bg-white/[0.03] md:backdrop-blur-xl",
              "md:shadow-[var(--shadow-floating)]",
              "md:px-8 md:py-8 lg:px-12 lg:py-10 xl:px-16",
              // Inner highlight edge to sell the depth
              "md:before:pointer-events-none md:before:absolute md:before:inset-0",
              "md:before:rounded-[inherit] md:before:[box-shadow:inset_0_1px_0_oklch(1_0_0_/_0.10),inset_0_-1px_0_oklch(0_0_0_/_0.30)]",
            ],
            className
          )}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
