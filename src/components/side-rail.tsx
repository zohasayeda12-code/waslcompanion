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
 * SideRail — desktop-only nav that hugs the left edge of the reading canvas.
 *
 * Positioned relative to the viewport center so it tracks the AppShell's
 * centered "device" frame at every breakpoint, instead of anchoring to the
 * browser edge. Feels like part of the same composition as the content.
 *
 * Canvas max-widths (see app-shell.tsx):
 *   md=520  lg=720  xl=840  2xl=920
 * Rail's right edge sits ~16px outside the canvas's left edge.
 */
export function SideRail() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const active = items.find((it) => it.match(pathname));

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "immersive-soften pointer-events-none fixed top-1/2 -translate-y-1/2 z-30",
        "hidden md:block",
        // Rail's right edge ≈ canvas left edge + small gap
        "md:right-[calc(50%+276px)]",
        "lg:right-[calc(50%+376px)]",
        "xl:right-[calc(50%+436px)]",
        "2xl:right-[calc(50%+476px)]",
      )}
    >
      <nav className="pointer-events-auto flex flex-col items-end gap-6">
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
                "group relative flex items-center justify-end",
                "transition-colors duration-300",
                isActive
                  ? "text-foreground/90"
                  : "text-foreground/30 hover:text-foreground/75",
              )}
            >
              {/* Label appears to the LEFT of icon on hover, so the icon stays aligned with the canvas edge */}
              <span
                className={cn(
                  "pointer-events-none mr-2 whitespace-nowrap text-[10.5px] tracking-[0.18em] uppercase",
                  "text-foreground/55",
                  "max-w-0 overflow-hidden opacity-0 translate-x-1",
                  "transition-all duration-300 ease-out",
                  "group-hover:max-w-[120px] group-hover:opacity-100 group-hover:translate-x-0",
                  isActive && "text-foreground/70",
                )}
              >
                {it.label}
              </span>
              <Icon
                className={cn(
                  "size-[17px] transition-transform duration-300",
                  isActive && "scale-105",
                )}
                strokeWidth={isActive ? 1.85 : 1.5}
              />
              {/* Tiny dot sits just right of the icon, kissing the canvas edge for active state */}
              <span
                aria-hidden
                className={cn(
                  "absolute -right-[10px] top-1/2 -translate-y-1/2 size-[3px] rounded-full",
                  "transition-all duration-300 ease-out",
                  isActive
                    ? "bg-[color:var(--gold)] opacity-90"
                    : "bg-foreground/40 opacity-0 group-hover:opacity-60",
                )}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
