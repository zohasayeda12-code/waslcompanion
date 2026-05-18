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
 * The rail spans the full height of the reading canvas (matching the
 * AppShell's vertical padding) so it reads as part of the same composition
 * rather than a floating capsule. Icons sit at the top, aligned with the
 * reading area's header.
 *
 * Canvas max-widths (see app-shell.tsx):
 *   md=640  lg=860  xl=1000  2xl=1080
 * Rail's right edge sits just outside the canvas's left edge with a small gap.
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
        // Match the AppShell canvas vertical bounds (py-10 / lg:py-14)
        "top-10 bottom-10 lg:top-14 lg:bottom-14",
        // Cap height so the rail mirrors the canvas's min-h on tall viewports
        "max-h-[min(880px,90dvh)] my-auto",
        // Anchor rail just outside the canvas's left edge (~14px gap)
        "md:right-[calc(50%+334px)]",
        "lg:right-[calc(50%+444px)]",
        "xl:right-[calc(50%+514px)]",
        "2xl:right-[calc(50%+554px)]",
      )}
    >
      <nav
        className={cn(
          "pointer-events-auto relative flex h-full flex-col items-center gap-2 px-2 pt-7 pb-5",
          // Ultra-soft glass rail surface mirroring the canvas frame
          "rounded-[2rem]",
          "border border-white/[0.06]",
          "bg-[oklch(0.20_0.03_275_/_0.22)] backdrop-blur-2xl",
          "shadow-[0_8px_40px_-12px_oklch(0_0_0_/_0.45),inset_0_1px_0_oklch(1_0_0_/_0.06),inset_0_-1px_0_oklch(0_0_0_/_0.25)]",
          // Gentle edge glow
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:[background:radial-gradient(120%_40%_at_50%_0%,oklch(0.82_0.14_82_/_0.05),transparent_70%)]",
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
                "size-11 rounded-2xl",
                "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                "hover:bg-white/[0.05]",
                "active:scale-[0.96]",
                isActive
                  ? "text-foreground bg-white/[0.04]"
                  : "text-foreground/40 hover:text-foreground/90",
              )}
            >
              {/* Soft halo behind active icon */}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-2xl animate-in fade-in duration-700"
                  style={{
                    background:
                      "radial-gradient(65% 65% at 50% 50%, oklch(0.82 0.14 82 / 0.22), transparent 75%)",
                  }}
                />
              )}

              <Icon
                className={cn(
                  "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  "size-[18px] group-hover:scale-110",
                  isActive && "size-[19px] drop-shadow-[0_0_10px_oklch(0.82_0.14_82_/_0.5)]",
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />

              {/* Gold side accent on the active item — orients the user */}
              <span
                aria-hidden
                className={cn(
                  "absolute -right-[11px] top-1/2 -translate-y-1/2",
                  "w-[2px] rounded-full bg-[color:var(--gold)]",
                  "transition-all duration-500 ease-out",
                  isActive
                    ? "h-5 opacity-95 shadow-[0_0_10px_oklch(0.82_0.14_82_/_0.7)]"
                    : "h-2 opacity-0",
                )}
              />

              {/* Hover label tooltip (left of icon) */}
              <span
                className={cn(
                  "pointer-events-none absolute right-full mr-3 whitespace-nowrap",
                  "text-[10.5px] tracking-[0.2em] uppercase text-foreground/75",
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
