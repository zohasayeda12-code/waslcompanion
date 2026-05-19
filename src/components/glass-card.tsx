import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** strong = brighter, more prominent. Default = subtle glass. */
  tone?: "default" | "strong";
  /** Adds a soft aurora glow underneath. */
  glow?: boolean;
  /** Adds tactile hover/press feedback. Use when the card is clickable. */
  interactive?: boolean;
};

/**
 * GlassCard — layered translucent surface with an inner light edge.
 * Sits beautifully on the night canvas. Mobile-first padding with clamp().
 */
export function GlassCard({
  children,
  tone = "default",
  glow = false,
  interactive = false,
  className,
  ...rest
}: Props) {
  return (
    <div
      {...rest}
      className={cn(
        "relative isolate rounded-3xl p-[clamp(1rem,4.5vw,1.5rem)]",
        tone === "strong" ? "glass-strong" : "glass",
        interactive && "interactive-card",
        glow &&
          "after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] after:[background:var(--gradient-gold-glow)] after:opacity-50 after:blur-2xl",
        className
      )}
    >
      {children}
    </div>
  );
}
