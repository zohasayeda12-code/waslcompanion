import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "glass" | "gold";

type BaseProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

const variants: Record<Variant, string> = {
  primary:
    "text-primary-foreground bg-[var(--gradient-primary)] " +
    "shadow-[var(--shadow-glow-primary)] " +
    "before:bg-[linear-gradient(180deg,oklch(1_0_0_/_0.18),transparent_55%)]",
  gold:
    "text-[oklch(0.20_0.04_60)] bg-[var(--gradient-aurora)] " +
    "shadow-[var(--shadow-glow-gold)] " +
    "before:bg-[linear-gradient(180deg,oklch(1_0_0_/_0.25),transparent_55%)]",
  glass:
    "text-foreground glass " +
    "before:bg-[linear-gradient(180deg,oklch(1_0_0_/_0.10),transparent_60%)]",
  ghost:
    "text-foreground/80 hover:text-foreground hover:bg-white/5 " +
    "before:hidden",
};

const base =
  "group relative isolate inline-flex h-14 w-full items-center justify-center rounded-2xl px-6 " +
  "text-base font-medium tracking-tight " +
  "select-none touch-manipulation " +
  "transition-all duration-200 ease-[var(--ease-spring)] " +
  "active:scale-[0.97] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "disabled:opacity-60 disabled:pointer-events-none " +
  // inner highlight pseudo-element
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:opacity-90 before:-z-10";

export function PrimaryButton({
  variant = "primary",
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<"button">) {
  return (
    <button {...rest} className={cn(base, variants[variant], className)}>
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function PrimaryLink({
  variant = "primary",
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<typeof Link>) {
  return (
    <Link {...rest} className={cn(base, variants[variant], className)}>
      <span className="relative z-10">{children}</span>
    </Link>
  );
}
