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
          "pointer-events-auto ml-3 lg:ml-5 flex flex-col items-center gap-1",
          "rounded-full border border-white/[0.06]",
          "bg-[oklch(0.16_0.025_280_/_0.55)] backdrop-blur-xl",
          "px-1.5 py-3",
          "shadow-[0_20px_60px_-20px_oklch(0_0_0_/_0.55)]",
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
                "group relative flex size-10 items-center justify-center rounded-full",
                "transition-all duration-200 active:scale-[0.94]",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground/60 hover:text-foreground/90",
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full"
                  style={{
                    background:
                      "radial-gradient(60% 80% at 50% 50%, oklch(0.82 0.14 82 / 0.18), transparent 70%)",
                  }}
                />
              )}
              <Icon
                className={cn("size-[18px] transition-transform", isActive && "scale-105")}
                strokeWidth={isActive ? 2.2 : 1.7}
              />
              {/* Tooltip label */}
              <span
                className={cn(
                  "pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-full",
                  "border border-white/10 bg-background/80 px-2.5 py-1 text-[11px] font-medium tracking-wide text-foreground/90",
                  "opacity-0 -translate-x-1 transition-all duration-200",
                  "group-hover:opacity-100 group-hover:translate-x-0",
                  "backdrop-blur-md shadow-[0_8px_24px_-12px_oklch(0_0_0_/_0.6)]",
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
