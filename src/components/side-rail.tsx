import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Home, BookOpen, Bookmark, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDisplayName, logout } from "@/lib/profile.functions";

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
 * Layout (top → bottom):
 *   • WASL moon logo (brand mark)
 *   • spacer
 *   • primary nav: Home, Quran, My Ayahs, Settings
 *   • flexible spacer
 *   • profile + logout pinned to the bottom
 */
export function SideRail() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const nameFn = useServerFn(getDisplayName);
  const logoutFn = useServerFn(logout);
  const { data: nameData } = useQuery({
    queryKey: ["display-name"],
    queryFn: () => nameFn(),
    staleTime: 5 * 60 * 1000,
  });
  const initial = (nameData?.name?.trim()?.[0] ?? "").toUpperCase() || "·";

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const active = items.find((it) => it.match(pathname));

  const handleLogout = async () => {
    try { await logoutFn(); } catch {}
    navigate({ to: "/login" });
  };
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "relative flex flex-col items-center",
        "shrink-0 self-stretch",
        "w-[68px] lg:w-[76px]",
        "pt-3 pb-3 pr-3 lg:pr-4",
        // Hairline divider that visually fuses rail + content into one surface
        "border-r border-white/[0.06]",
        "before:pointer-events-none before:absolute before:inset-y-6 before:right-[-1px]",
        "before:w-px before:[background:linear-gradient(to_bottom,transparent,oklch(1_0_0_/_0.08),transparent)]",
      )}
    >
      {/* Brand mark — WASL moon + wordmark (non-interactive) */}
      <div
        aria-label="Wasl"
        className="relative mb-5 flex flex-col items-center gap-1.5"
      >
        <div className="relative flex size-11 items-center justify-center rounded-2xl">
          <span
            aria-hidden
            className="absolute inset-0 -z-10 rounded-2xl opacity-80"
            style={{
              background:
                "radial-gradient(65% 65% at 50% 45%, oklch(0.82 0.14 82 / 0.22), transparent 75%)",
            }}
          />
          <svg
            viewBox="0 0 64 64"
            className="size-[26px] drop-shadow-[0_0_10px_oklch(0.82_0.14_82_/_0.55)]"
            fill="none"
            stroke="oklch(0.92 0.10 82)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M48 32a18 18 0 1 1-18-18 14 14 0 0 0 18 18z" />
          </svg>
        </div>
        <span
          className="text-aurora text-[11px] font-bold tracking-[0.28em]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          WASL
        </span>
      </div>

      {/* Subtle divider after brand */}
      <span
        aria-hidden
        className="mb-4 h-px w-7 bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />


      {/* Primary nav */}
      <div className="flex flex-col items-center gap-1.5">
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
                isActive ? "text-foreground" : "text-foreground/40 hover:text-foreground/90",
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
      </div>

      {/* Cluster: profile initial + logout — placed right under Settings, not pinned to bottom */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <span
          aria-hidden
          className="mb-1 h-px w-7 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
          className={cn(
            "group flex size-11 items-center justify-center rounded-2xl",
            "text-foreground/45 hover:text-foreground/90 hover:bg-white/[0.04]",
            "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96]",
          )}
        >
          <LogOut className="size-[18px] transition-transform group-hover:scale-110" strokeWidth={1.6} />
        </button>

        <div
          aria-label={nameData?.name ? `Signed in as ${nameData.name}` : "Profile"}
          title={nameData?.name ?? "Profile"}
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            "border border-white/[0.08] bg-white/[0.03]",
            "text-[12px] font-semibold tracking-wide text-foreground/80",
            "select-none",
          )}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {initial}
        </div>
      </div>
    </nav>
  );
}
