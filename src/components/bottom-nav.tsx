import { Link, useLocation } from "@tanstack/react-router";
import { Home, BookOpen, Bookmark, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

const items: Item[] = [
  { to: "/home", label: "Home", icon: Home, match: (p) => p === "/home" || p.startsWith("/ayah") && getFrom() === "home" },
  { to: "/quran", label: "Quran", icon: BookOpen, match: (p) => p.startsWith("/quran") || (p.startsWith("/ayah") && getFrom() === "quran") },
  { to: "/my-ayahs", label: "My Ayahs", icon: Bookmark, match: (p) => p.startsWith("/my-ayahs") || (p.startsWith("/ayah") && (getFrom() === "my-ayahs" || getFrom() === "bookmarks" || getFrom() === "highlights" || getFrom() === "reflections" || getFrom() === "revisited")) },
  { to: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
];

function getFrom(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("from") ?? "";
}

const HIDDEN_PREFIXES = ["/onboarding", "/live/"];

export function BottomNav() {
  const { pathname } = useLocation();
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  // Determine active by best match; fall back to no active.
  const active = items.find((it) => it.match(pathname));

  const press = () => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
    } catch {}
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "immersive-fade fixed inset-x-0 bottom-0 z-40 flex justify-center md:hidden",
        "pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2",
        "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-3 flex w-full max-w-[420px] items-center justify-around",
          "rounded-full border border-white/[0.08]",
          "bg-[oklch(0.16_0.025_280_/_0.72)] backdrop-blur-xl",
          "shadow-[0_10px_40px_-10px_oklch(0_0_0_/_0.6)]",
          "px-2 py-1.5",
        )}
      >
        {items.map((it) => {
          const isActive = active?.to === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={press}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex min-w-[56px] flex-col items-center gap-0.5 rounded-full px-3 py-1.5",
                "transition-all duration-200 active:scale-[0.94]",
                isActive ? "text-foreground" : "text-muted-foreground/70 hover:text-foreground/90",
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
              <Icon className={cn("size-[18px] transition-transform", isActive && "scale-105")} strokeWidth={isActive ? 2.2 : 1.7} />
              <span className="text-[10px] font-medium tracking-wide">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
