import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  variant?: "primary" | "ghost";
  children: ReactNode;
  className?: string;
};

const styles = {
  primary:
    "bg-[var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)] active:scale-[0.985]",
  ghost:
    "bg-transparent text-foreground/80 hover:text-foreground hover:bg-secondary/60",
} as const;

const base =
  "inline-flex h-14 w-full items-center justify-center rounded-2xl px-6 text-base font-medium tracking-tight transition-all duration-300 ease-out select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function PrimaryButton({
  variant = "primary",
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<"button">) {
  return (
    <button {...rest} className={cn(base, styles[variant], className)}>
      {children}
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
    <Link {...rest} className={cn(base, styles[variant], className)}>
      {children}
    </Link>
  );
}
