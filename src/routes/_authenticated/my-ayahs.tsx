import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { listBookmarks, listReflections, listRevisited } from "@/lib/library.functions";
import { listHighlights } from "@/lib/highlights.functions";
import { listAllIntentions } from "@/lib/intentions.functions";
import { getSyncStatus } from "@/lib/sync.functions";

export const Route = createFileRoute("/_authenticated/my-ayahs")({
  head: () => ({ meta: [{ title: "My Ayahs — Wasl" }] }),
  component: MyAyahs,
});

const HIGHLIGHT_HEX: Record<string, string> = {
  gold: "oklch(0.82 0.14 82)",
  emerald: "oklch(0.74 0.14 168)",
  rose: "oklch(0.78 0.12 20)",
  violet: "oklch(0.70 0.12 300)",
  sky: "oklch(0.78 0.10 230)",
};

type Segment = "living" | "reflections" | "highlights" | "bookmarks" | "revisited";

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: "living", label: "Living" },
  { id: "reflections", label: "Reflections" },
  { id: "highlights", label: "Highlights" },
  { id: "bookmarks", label: "Bookmarks" },
  { id: "revisited", label: "Revisited" },
];

function MyAyahs() {
  const qc = useQueryClient();
  const bm = useServerFn(listBookmarks);
  const re = useServerFn(listReflections);
  const hl = useServerFn(listHighlights);
  const intents = useServerFn(listAllIntentions);
  const rv = useServerFn(listRevisited);
  const status = useServerFn(getSyncStatus);
  const { data: bookmarks = [] } = useQuery({ queryKey: ["bookmarks"], queryFn: () => bm() });
  const { data: reflections = [] } = useQuery({ queryKey: ["reflections"], queryFn: () => re({ data: {} }) });
  const { data: highlights = [] } = useQuery({ queryKey: ["highlights"], queryFn: () => hl({ data: {} }) });
  const { data: allIntents = [] } = useQuery({ queryKey: ["intents-all"], queryFn: () => intents() });
  const { data: revisited = [] } = useQuery({ queryKey: ["revisited"], queryFn: () => rv() });
  const { data: syncState } = useQuery({
    queryKey: ["sync-status"],
    queryFn: () => status(),
    refetchInterval: (q) => (q.state.data?.syncing ? 3000 : false),
  });

  const [segment, setSegment] = useState<Segment>("living");

  const lived = useMemo(
    () =>
      allIntents
        .filter((i: any) => i.status === "lived")
        .sort((a: any, b: any) =>
          (b.lived_at ?? b.updated_at ?? "").localeCompare(a.lived_at ?? a.updated_at ?? ""),
        ),
    [allIntents],
  );
  const carried = useMemo(
    () => allIntents.filter((i: any) => (i.carry_forward_count ?? 0) > 0 && i.status !== "lived"),
    [allIntents],
  );

  useEffect(() => {
    if (!syncState?.syncing) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      qc.invalidateQueries({ queryKey: ["reflections"] });
    }, 3000);
    return () => clearInterval(t);
  }, [syncState?.syncing, qc]);

  const counts: Record<Segment, number> = {
    living: lived.length,
    reflections: reflections.length,
    highlights: highlights.length,
    bookmarks: bookmarks.length,
    revisited: revisited.length,
  };

  return (
    <AppShell>
      <header>
        <Link to="/home" className="text-xs uppercase tracking-[0.22em] text-muted-foreground/80">
          ← Home
        </Link>
        <h1
          className="mt-3 text-[clamp(1.6rem,5.2vw,2.1rem)] font-medium tracking-tight text-foreground/90"
          style={{ fontFamily: "var(--font-display)" }}
        >
          My Ayahs
        </h1>
        {syncState?.syncing ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/60" aria-live="polite">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/50" />
            bringing your ayahs in…
          </p>
        ) : null}
      </header>

      {/* Segmented rail */}
      <div className="mt-7" role="tablist" aria-label="Filter ayahs">
        <div className="-mx-[clamp(1rem,4vw,1.5rem)] overflow-x-auto px-[clamp(1rem,4vw,1.5rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-full rounded-full border border-white/[0.06] bg-white/[0.025] p-1 backdrop-blur-md">
            {SEGMENTS.map((s) => {
              const active = segment === s.id;
              return (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSegment(s.id)}
                  className={cn(
                    "relative z-[1] flex-1 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium tracking-wide transition-colors",
                    active ? "text-foreground" : "text-muted-foreground/65 hover:text-foreground/85",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="my-ayahs-segment-pill"
                      className="absolute inset-0 -z-[1] rounded-full bg-foreground/[0.07] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="inline-flex items-baseline gap-1.5">
                    {s.label}
                    {counts[s.id] > 0 && (
                      <span className={cn("text-[10px] tabular-nums", active ? "text-muted-foreground/70" : "text-muted-foreground/45")}>
                        {counts[s.id]}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={segment}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {segment === "living" && <LivingPanel lived={lived} carried={carried} />}
            {segment === "reflections" && <ReflectionsPanel reflections={reflections} />}
            {segment === "highlights" && <HighlightsPanel highlights={highlights} />}
            {segment === "bookmarks" && <BookmarksPanel bookmarks={bookmarks} />}
            {segment === "revisited" && <RevisitedPanel revisited={revisited} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-24" />
    </AppShell>
  );
}

/* ---------- Panels ---------- */

function LivingPanel({ lived, carried }: { lived: any[]; carried: any[] }) {
  if (lived.length === 0 && carried.length === 0) {
    return <EmptyNote>Ayahs you carry and live with will gather here.</EmptyNote>;
  }
  const featured = lived[0];
  const restLived = lived.slice(1, 6);

  return (
    <div>
      {featured && (
        <Link
          to="/ayah/$surah/$ayah"
          params={{ surah: String(featured.surah), ayah: String(featured.ayah) }}
          search={{ from: "my-ayahs" as any }}
          className="group block"
        >
          <article
            className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.06]"
            style={{
              background:
                "linear-gradient(168deg, oklch(0.22 0.03 270 / 0.55), oklch(0.18 0.025 280 / 0.65))",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 left-1/2 -z-10 size-64 -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
              style={{ background: "var(--gradient-gold-glow)" }}
            />
            <div className="px-[clamp(1.5rem,5vw,2.25rem)] py-[clamp(2rem,6vw,2.75rem)]">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]/70">Lived</p>
              <p
                className="mt-5 text-[clamp(1.15rem,3.6vw,1.35rem)] leading-[1.7] text-foreground/90"
                style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
              >
                “{featured.text}”
              </p>
              <p className="mt-6 text-[10px] uppercase tracking-[0.24em] text-muted-foreground/70">
                Surah {featured.surah} · {featured.surah}:{featured.ayah}
                {featured.lived_at && <> · {relativeDay(featured.lived_at)}</>}
              </p>
            </div>
          </article>
        </Link>
      )}

      {restLived.length > 0 && (
        <ul className="mt-5 grid gap-1.5">
          {restLived.map((it: any) => (
            <li key={it.id}>
              <Link
                to="/ayah/$surah/$ayah"
                params={{ surah: String(it.surah), ayah: String(it.ayah) }}
                search={{ from: "my-ayahs" as any }}
                className="flex items-baseline gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/75 transition-colors hover:bg-white/[0.03]"
              >
                <span className="font-mono text-[11px] tracking-tight text-muted-foreground/70">
                  {it.surah}:{it.ayah}
                </span>
                <span className="line-clamp-1 flex-1 text-foreground/80">{it.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {carried.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
            Recently carried
          </h2>
          <ul className="grid gap-1.5">
            {carried.slice(0, 6).map((it: any) => (
              <li key={it.id}>
                <Link
                  to="/ayah/$surah/$ayah"
                  params={{ surah: String(it.surah), ayah: String(it.ayah) }}
                  search={{ from: "my-ayahs" as any }}
                  className="flex items-baseline gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <span className="font-mono text-[11px] tracking-tight text-muted-foreground/70">
                    {it.surah}:{it.ayah}
                  </span>
                  <span className="line-clamp-1 flex-1 text-foreground/75">{it.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReflectionsPanel({ reflections }: { reflections: any[] }) {
  if (reflections.length === 0) {
    return <EmptyNote>Your written reflections will gather quietly here.</EmptyNote>;
  }
  return (
    <ul className="grid gap-3">
      {reflections.map((r: any) => (
        <li key={r.id ?? `${r.surah}-${r.ayah}`}>
          <Link
            to="/ayah/$surah/$ayah"
            params={{ surah: String(r.surah), ayah: String(r.ayah) }}
            search={{ from: "reflections" as any }}
            className="block rounded-2xl border border-white/[0.04] bg-white/[0.018] p-4 transition-colors hover:bg-white/[0.035]"
          >
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              {r.surah}:{r.ayah}
            </p>
            <div className="relative mt-2 max-h-[3.2em] overflow-hidden">
              <p className="text-[0.95rem] leading-[1.6] text-foreground/80 line-clamp-2">{r.body}</p>
              {r.body && r.body.length > 110 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
                  style={{
                    background: "linear-gradient(to bottom, transparent, oklch(0.18 0.025 280 / 0.85))",
                  }}
                />
              )}
            </div>
            {r.body && r.body.length > 110 && (
              <p className="mt-2 text-[11px] tracking-wide text-[color:var(--gold)]/70">
                Continue reflection →
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function HighlightsPanel({ highlights }: { highlights: any[] }) {
  if (highlights.length === 0) {
    return <EmptyNote>Ayahs you mark will appear here as soft chips.</EmptyNote>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {highlights.map((h: any, idx: number) => (
        <li key={`${h.surah}-${h.ayah}-${idx}`}>
          <Link
            to="/ayah/$surah/$ayah"
            params={{ surah: String(h.surah), ayah: String(h.ayah) }}
            search={{ from: "highlights" as any }}
            className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-xs font-mono tracking-tight text-foreground/70 transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: HIGHLIGHT_HEX[h.color] ?? "var(--muted-foreground)" }}
              aria-hidden
            />
            {h.surah}:{h.ayah}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BookmarksPanel({ bookmarks }: { bookmarks: any[] }) {
  if (bookmarks.length === 0) {
    return <EmptyNote>Bookmarked ayahs will rest here for quick return.</EmptyNote>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {bookmarks.map((b: any, idx: number) => (
        <li key={b.id ?? `${b.surah}-${b.ayah}-${idx}`}>
          <Link
            to="/ayah/$surah/$ayah"
            params={{ surah: String(b.surah), ayah: String(b.ayah) }}
            search={{ from: "bookmarks" as any }}
            className="inline-flex items-center rounded-full border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-xs font-mono tracking-tight text-foreground/75 transition-colors hover:bg-white/[0.05] hover:text-foreground"
          >
            {b.surah}:{b.ayah}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RevisitedPanel({ revisited }: { revisited: any[] }) {
  if (revisited.length === 0) {
    return <EmptyNote>Ayahs you return to will surface here gently.</EmptyNote>;
  }
  return (
    <ul className="grid gap-1.5">
      {revisited.map((it: any, idx: number) => (
        <li key={it.id ?? `${it.surah}-${it.ayah}-${idx}`}>
          <Link
            to="/ayah/$surah/$ayah"
            params={{ surah: String(it.surah), ayah: String(it.ayah) }}
            search={{ from: "revisited" as any }}
            className="flex items-baseline gap-3 rounded-xl px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-white/[0.03]"
          >
            <span className="font-mono text-[11px] tracking-tight text-muted-foreground/60">
              {it.surah}:{it.ayah}
            </span>
            {it.label && <span className="line-clamp-1 flex-1 text-muted-foreground">{it.label}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 text-center text-sm text-muted-foreground/70">{children}</p>
  );
}

function relativeDay(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
