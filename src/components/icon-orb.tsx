import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "gold" | "violet" | "rose";

const tones: Record<Tone, { bg: string; glow: string }> = {
  primary: {
    bg: "[background:var(--gradient-primary)]",
    glow: "shadow-[var(--shadow-glow-primary)]",
  },
  gold: {
    bg: "[background:var(--gradient-aurora)]",
    glow: "shadow-[var(--shadow-glow-gold)]",
  },
  violet: {
    bg: "[background:linear-gradient(135deg,oklch(0.55_0.18_295),oklch(0.40_0.15_270))]",
    glow: "shadow-[0_0_0_1px_oklch(0.70_0.16_295_/_0.30),0_10px_40px_oklch(0.70_0.16_295_/_0.35)]",
  },
  rose: {
    bg: "[background:linear-gradient(135deg,oklch(0.65_0.16_18),oklch(0.45_0.14_30))]",
    glow: "shadow-[0_0_0_1px_oklch(0.74_0.14_18_/_0.30),0_10px_40px_oklch(0.74_0.14_18_/_0.35)]",
  },
};

type Props = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

const sizes = {
  sm: "size-10 rounded-xl",
  md: "size-14 rounded-2xl",
  lg: "size-16 rounded-3xl",
};

/**
 * IconOrb — gradient pill containing an icon. Used for hero icons.
 */
export function IconOrb({
  tone = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  const t = tones[tone];
  return (
    <div
      {...rest}
      className={cn(
        "relative isolate flex items-center justify-center text-white",
        sizes[size],
        t.bg,
        t.glow,
        // inner light edge
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
        "before:[background:linear-gradient(180deg,oklch(1_0_0_/_0.25),transparent_55%)]",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
    </div>
  );
}
