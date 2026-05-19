import { motion } from "motion/react";
import type { ReactNode } from "react";
import { AmbientCanvas } from "./ambient-canvas";
import { SideRail } from "./side-rail";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** When true (default), wraps content in the unified desktop reading frame. */
  framed?: boolean;
};

/**
 * AppShell — the responsive container that frames every Wasl screen.
 *
 * Mobile (<768px):  edge-to-edge, safe-area aware. Bottom nav floats below.
 * Tablet/desktop:   a single unified reading desk — one rounded glass frame
 *                   containing the navigation spine on the left and the
 *                   reading canvas on the right, divided only by a hairline.
 *                   The ambient aurora flows behind everything as one world.
 */
export function AppShell({ children, className = "", framed = true }: Props) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden">
      <AmbientCanvas />

      <div
        className={cn(
          "relative z-[1] flex min-h-[100dvh] w-full justify-center",
          framed ? "md:items-center md:py-10 lg:py-14" : "",
        )}
      >
        {/* Outer unified frame: nav + content share one surface on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative flex w-full flex-col",
            framed && [
              "md:flex-row",
              "md:max-w-[720px] lg:max-w-[940px] xl:max-w-[1080px] 2xl:max-w-[1160px]",
              "md:min-h-[min(880px,90dvh)]",
              "md:rounded-[2.25rem]",
              "md:border md:border-white/10",
              "md:bg-white/[0.03] md:backdrop-blur-xl",
              "md:shadow-[var(--shadow-floating)]",
              "md:overflow-hidden",
              // Inner highlight edge sells the depth of the unified surface
              "md:before:pointer-events-none md:before:absolute md:before:inset-0 md:before:z-[2]",
              "md:before:rounded-[inherit] md:before:[box-shadow:inset_0_1px_0_oklch(1_0_0_/_0.10),inset_0_-1px_0_oklch(0_0_0_/_0.30)]",
              // Soft warm wash bleeding from the rail into the canvas — ties them together
              "md:after:pointer-events-none md:after:absolute md:after:inset-0 md:after:-z-[1]",
              "md:after:[background:radial-gradient(60%_45%_at_0%_25%,oklch(0.82_0.14_82_/_0.06),transparent_70%)]",
            ],
          )}
        >
          {/* Left spine — only on desktop, inside the same frame */}
          {framed && (
            <div className="hidden md:flex md:items-start md:pt-[clamp(2rem,4vh,3rem)]">
              <SideRail />
            </div>
          )}

          {/* Reading canvas */}
          <main
            className={cn(
              "relative flex w-full flex-col",
              // Mobile padding
              "px-[clamp(1rem,5vw,1.5rem)]",
              "pt-[max(env(safe-area-inset-top),1.25rem)]",
              "pb-[calc(max(env(safe-area-inset-bottom),1rem)+5.5rem)]",
              "min-h-[100dvh]",
              // Desktop: integrated padding inside the unified frame
              framed && [
                "md:min-h-0 md:flex-1",
                "md:pt-8 md:pb-8 lg:pt-10 lg:pb-10",
                "md:pl-8 md:pr-8 lg:pl-12 lg:pr-12 xl:pl-16 xl:pr-16",
              ],
              className,
            )}
          >
            {children}
          </main>
        </motion.div>
      </div>
    </div>
  );
}
