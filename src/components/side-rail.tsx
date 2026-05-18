import { Link, useLocation } from "@tanstack/react-router";
import { Home, BookOpen, Bookmark, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

function getFrom(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("from") ?? "";
}

const items: Item[] = [
  { to: "/home", label: "Home", icon: Home, match: (p) => p === "/home" || (p.startsWith("/ayah") && getFrom() === "home") },
  { to: "/quran", label: "Quran", icon: BookOpen, match: (p) => p.startsWith("/quran") || (p.startsWith("/ayah") && getFrom() === "quran") },
  { to: "/my-ayahs", label: "My Ayahs", icon: Bookmark, match: (p) => p.startsWith("/my-ayahs") || (p.startsWith("/ayah") && ["my-ayahs","bookmarks","highlights","reflections","revisited"].includes(getFrom())) },
  { to: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
];

const HIDDEN_PREFIXES = ["/onboarding", "/live/"];

/**
 * SideRail — desktop-only navigation companion to the reading canvas.
 *
 * Visually: an ultra-soft glass column that lightly groups the icons without
 * becoming a heavy sidebar. Top-aligned with the upper content so it reads as
 * a companion to the Quran, not a generic productivity sidebar.
 *
 * Canvas max-widths (see app-shell.tsx):
 *   md=560  lg=760  xl=880  2xl=960
 * Rail's right edge sits just outside the canvas's left edge.
 */
export function SideRail() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const active = items.find((it) => it.match(pathname));

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "immersive-soften pointer-events-none fixed z-30",
        "hidden md:block",
        // Vertically aligned with upper reading area (not centered)
        "top-[14vh] xl:top-[16vh]",
        // Anchor rail just outside the canvas's left edge
        "md:right-[calc(50%+296px)]",
        "lg:right-[calc(50%+396px)]",
        "xl:right-[calc(50%+456px)]",
        "2xl:right-[calc(50%+496px)]",
      )}
    >
      <nav
        className={cn(
          "pointer-events-auto relative flex flex-col items-center gap-1.5 px-1.5 py-3",
          // Ultra-soft glass rail surface
          "rounded-full",
          "border border-white/[0.05]",
          "bg-[oklch(0.20_0.03_275_/_0.28)] backdrop-blur-xl",
          "shadow-[0_8px_40px_-12px_oklch(0_0_0_/_0.5),inset_0_1px_0_oklch(1_0_0_/_0.06)]",
          // Gentle edge glow
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:[background:radial-gradient(120%_60%_at_50%_0%,oklch(0.82_0.14_82_/_0.06),transparent_70%)]",
        )}
      >
        {items.map((it) => {
          const isActive = active?.to === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              aria-current={isActive ? "page" : undefined}
              title={it.label}
              className={cn(
                "group relative flex items-center justify-center",
                "size-10 rounded-full",
                "transition-all duration-[400ms] ease-out",
                "hover:bg-white/[0.04]",
                isActive
                  ? "text-foreground"
                  : "text-foreground/40 hover:text-foreground/90",
              )}
            >
              {/* Soft halo behind active icon */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full animate-in fade-in duration-500"
                  style={{
                    background:
                      "radial-gradient(60% 60% at 50% 50%, oklch(0.82 0.14 82 / 0.22), transparent 72%)",
                  }}
                />
              )}

              <Icon
                className={cn(
                  "transition-all duration-[400ms] ease-out",
                  "size-[18px] group-hover:scale-110",
                  isActive && "size-[19px] drop-shadow-[0_0_8px_oklch(0.82_0.14_82_/_0.45)]",
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />

              {/* Tiny gold side accent for the active item */}
              <span
                aria-hidden
                className={cn(
                  "absolute -right-[10px] top-1/2 -translate-y-1/2",
                  "h-4 w-[2px] rounded-full bg-[color:var(--gold)]",
                  "transition-all duration-[400ms] ease-out",
                  isActive
                    ? "opacity-90 shadow-[0_0_8px_oklch(0.82_0.14_82_/_0.6)]"
                    : "opacity-0 h-2",
                )}
              />

              {/* Hover label tooltip (left of icon) */}
              <span
                className={cn(
                  "pointer-events-none absolute right-full mr-3 whitespace-nowrap",
                  "text-[10.5px] tracking-[0.18em] uppercase text-foreground/70",
                  "opacity-0 -translate-x-1",
                  "transition-all duration-300 ease-out",
                  "group-hover:opacity-100 group-hover:translate-x-0",
                )}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
