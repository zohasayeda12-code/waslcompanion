import { useIdleAfter } from "@/hooks/use-idle";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Wraps the Live This Ayah CTA with a calm one-shot ambient glow that fades
 * in after a few seconds of inactivity. Cancels instantly on any interaction.
 */
export function AmbientLiveGlow({ children, className }: { children: ReactNode; className?: string }) {
  const idle = useIdleAfter(3000);
  return (
    <div className={cn("relative isolate", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] blur-2xl transition-opacity duration-[1800ms]",
          idle ? "opacity-100 animate-pulse-slow" : "opacity-0",
        )}
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, oklch(0.78 0.10 82 / 0.45), oklch(0.42 0.06 168 / 0.18) 60%, transparent 80%)",
        }}
      />
      {children}
    </div>
  );
}
