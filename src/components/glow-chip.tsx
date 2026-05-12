import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "emerald" | "gold" | "rose" | "violet";

const tones: Record<Tone, string> = {
  neutral: "text-foreground/85 bg-white/5 ring-white/10",
  emerald:
    "text-[color:var(--emerald)] bg-[oklch(0.74_0.14_168_/_0.10)] ring-[oklch(0.74_0.14_168_/_0.30)]",
  gold:
    "text-[color:var(--gold)] bg-[oklch(0.82_0.14_82_/_0.10)] ring-[oklch(0.82_0.14_82_/_0.30)]",
  rose:
    "text-[color:var(--rose)] bg-[oklch(0.74_0.14_18_/_0.10)] ring-[oklch(0.74_0.14_18_/_0.30)]",
  violet:
    "text-[color:var(--violet)] bg-[oklch(0.70_0.16_295_/_0.10)] ring-[oklch(0.70_0.16_295_/_0.30)]",
};

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  pulse?: boolean;
  children: ReactNode;
};

/**
 * GlowChip — small status pill. Color-coded, muted, never loud.
 */
export function GlowChip({
  tone = "neutral",
  pulse = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-tight ring-1 backdrop-blur-md",
        tones[tone],
        className
      )}
    >
      {pulse && (
        <span className="relative inline-flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-pulse-slow rounded-full bg-current opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
