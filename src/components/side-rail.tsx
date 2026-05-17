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
 * SideRail — slim desktop-only navigation rail.
 *
 * Hidden under md. On md+ it sits as a calm icon column on the far left,
 * never competing with the centered reading canvas. Softens under
 * `body.immersive` so contextual mushaf interactions remain the focus.
 */
export function SideRail() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const active = items.find((it) => it.match(pathname));

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "immersive-soften pointer-events-none fixed inset-y-0 left-0 z-30 hidden md:flex",
        "items-center",
      )}
    >
      <nav
        className={cn(
          "pointer-events-auto flex flex-col items-start gap-7 lg:gap-8",
          "pl-5 lg:pl-7 pr-2 py-6",
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
                "group relative flex items-center",
                "transition-opacity duration-300",
                isActive
                  ? "text-foreground"
                  : "text-foreground/35 hover:text-foreground/85",
              )}
            >
              {/* Vertical accent bar for active — feels like an edge marker, not a button */}
              <span
                aria-hidden
                className={cn(
                  "absolute -left-5 lg:-left-7 top-1/2 -translate-y-1/2 w-[2px] rounded-full",
                  "transition-all duration-300 ease-out",
                  isActive
                    ? "h-6 bg-[color:var(--gold)] shadow-[0_0_12px_oklch(0.82_0.14_82_/_0.55)]"
                    : "h-0 bg-transparent group-hover:h-3 group-hover:bg-foreground/30",
                )}
              />
              <Icon
                className={cn(
                  "size-[18px] transition-transform duration-300",
                  isActive && "scale-105",
                )}
                strokeWidth={isActive ? 1.9 : 1.5}
              />
              {/* Label slides in from the icon — reveals itself, no chip, no border */}
              <span
                className={cn(
                  "pointer-events-none ml-3 whitespace-nowrap text-[11px] tracking-[0.14em] uppercase",
                  "text-foreground/70",
                  "max-w-0 overflow-hidden opacity-0 -translate-x-1",
                  "transition-all duration-300 ease-out",
                  "group-hover:max-w-[140px] group-hover:opacity-100 group-hover:translate-x-0",
                  isActive && "text-foreground/85",
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
