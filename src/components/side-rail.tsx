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
 * SideRail — desktop-only navigation spine, rendered INSIDE the AppShell
 * frame as the left column of a single unified reading surface.
 *
 * No fixed positioning, no separate floating capsule: the rail shares the
 * same border, background, and shadow as the content canvas and is divided
 * from it only by a hairline vertical line. This makes the desktop layout
 * read as one contemplative reading desk rather than disconnected widgets.
 */
export function SideRail() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const active = items.find((it) => it.match(pathname));

  return (
    <nav
      aria-label="Primary"
      className={cn(
        // Inline left spine of the shared frame.
        "relative flex flex-col items-center gap-1.5",
        "shrink-0 self-stretch",
        "w-[68px] lg:w-[76px]",
        "pt-2 pb-2 pr-3 lg:pr-4",
        // Hairline divider that visually fuses rail + content into one surface
        "border-r border-white/[0.06]",
        "before:pointer-events-none before:absolute before:inset-y-6 before:right-[-1px]",
        "before:w-px before:[background:linear-gradient(to_bottom,transparent,oklch(1_0_0_/_0.08),transparent)]",
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
              "hover:bg-white/[0.04]",
              "active:scale-[0.96]",
              isActive
                ? "text-foreground"
                : "text-foreground/40 hover:text-foreground/90",
            )}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-0 -z-10 rounded-2xl animate-in fade-in duration-700"
                style={{
                  background:
                    "radial-gradient(65% 65% at 50% 50%, oklch(0.82 0.14 82 / 0.20), transparent 75%)",
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

            {/* Gold accent docked to the inner edge of the rail */}
            <span
              aria-hidden
              className={cn(
                "absolute -right-[13px] lg:-right-[17px] top-1/2 -translate-y-1/2",
                "w-[2px] rounded-full bg-[color:var(--gold)]",
                "transition-all duration-500 ease-out",
                isActive
                  ? "h-5 opacity-95 shadow-[0_0_10px_oklch(0.82_0.14_82_/_0.7)]"
                  : "h-2 opacity-0",
              )}
            />

            {/* Hover label tooltip (right of icon, inside content area) */}
            <span
              className={cn(
                "pointer-events-none absolute left-full ml-4 whitespace-nowrap",
                "text-[10.5px] tracking-[0.2em] uppercase text-foreground/70",
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
  );
}
