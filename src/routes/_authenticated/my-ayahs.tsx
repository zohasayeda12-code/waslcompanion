import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { SURAH_NAMES_AR, SURAH_NAMES_EN } from "@/lib/quran-structure";
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

  const living = useMemo(
    () =>
      [...allIntents]
        .filter((i: any) => i.status === "lived" || (i.carry_forward_count ?? 0) > 0)
        .sort((a: any, b: any) =>
          (b.lived_at ?? b.updated_at ?? "").localeCompare(a.lived_at ?? a.updated_at ?? ""),
        ),
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
    living: living.length,
    reflections: reflections.length,
    highlights: highlights.length,
    bookmarks: bookmarks.length,
    revisited: revisited.length,
  };

  return (
    <AppShell>
      <header>
        <h1
          className="text-[clamp(1.6rem,5.2vw,2.1rem)] font-medium tracking-tight text-foreground/90"
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
      <div className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={segment}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-x-4 md:gap-y-2.5"
          >
            {segment === "living" &&
              (living.length === 0 ? (
                <EmptyNote>Ayahs you carry and live with will gather here.</EmptyNote>
              ) : (
                living.map((it: any) => {
                  const isLived = it.status === "lived";
                  const meta = isLived
                    ? `Lived${it.lived_at ? ` · ${relativeDay(it.lived_at)}` : ""}`
                    : `Carried${it.updated_at ? ` · ${relativeDay(it.updated_at)}` : ""}`;
                  return (
                    <AyahPill
                      key={it.id}
                      surah={Number(it.surah)}
                      ayah={Number(it.ayah)}
                      from="my-ayahs"
                      meta={meta}
                      body={it.text ?? it.intention ?? ""}
                    />
                  );
                })
              ))}

            {segment === "reflections" &&
              (reflections.length === 0 ? (
                <EmptyNote>Your written reflections will gather quietly here.</EmptyNote>
              ) : (
                reflections.map((r: any) => (
                  <AyahPill
                    key={r.id ?? `${r.surah}-${r.ayah}`}
                    surah={Number(r.surah)}
                    ayah={Number(r.ayah)}
                    from="reflections"
                    meta={r.updated_at ? `Reflected · ${relativeDay(r.updated_at)}` : "Reflected"}
                    body={r.body ?? ""}
                  />
                ))
              ))}

            {segment === "highlights" &&
              (highlights.length === 0 ? (
                <EmptyNote>Ayahs you mark will appear here.</EmptyNote>
              ) : (
                highlights.map((h: any, idx: number) => (
                  <AyahPill
                    key={`${h.surah}-${h.ayah}-${idx}`}
                    surah={Number(h.surah)}
                    ayah={Number(h.ayah)}
                    from="highlights"
                    meta={h.created_at ? `Marked · ${relativeDay(h.created_at)}` : "Marked"}
                    accentDot={HIGHLIGHT_HEX[h.color]}
                  />
                ))
              ))}

            {segment === "bookmarks" &&
              (bookmarks.length === 0 ? (
                <EmptyNote>Bookmarked ayahs will rest here for quick return.</EmptyNote>
              ) : (
                bookmarks.map((b: any, idx: number) => (
                  <AyahPill
                    key={b.id ?? `${b.surah}-${b.ayah}-${idx}`}
                    surah={Number(b.surah)}
                    ayah={Number(b.ayah)}
                    from="bookmarks"
                    meta={b.created_at ? `Bookmarked · ${relativeDay(b.created_at)}` : "Bookmarked"}
                  />
                ))
              ))}

            {segment === "revisited" &&
              (revisited.length === 0 ? (
                <EmptyNote>Ayahs you return to will surface here gently.</EmptyNote>
              ) : (
                revisited.map((it: any, idx: number) => (
                  <AyahPill
                    key={it.id ?? `${it.surah}-${it.ayah}-${idx}`}
                    surah={Number(it.surah)}
                    ayah={Number(it.ayah)}
                    from="revisited"
                    meta={it.visited_at ? `Revisited · ${relativeDay(it.visited_at)}` : "Revisited"}
                    body={it.label ?? ""}
                  />
                ))
              ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="h-24" />
    </AppShell>
  );
}

/* ---------- Unified pill ---------- */

function AyahPill({
  surah,
  ayah,
  from,
  meta,
  body,
  accentDot,
}: {
  surah: number;
  ayah: number;
  from: string;
  meta?: string;
  body?: string;
  accentDot?: string;
}) {
  const [open, setOpen] = useState(false);
  const trimmed = (body ?? "").trim();
  const hasBody = trimmed.length > 0;
  const isLong = trimmed.length > 80;
  const preview = isLong ? trimmed.slice(0, 80).trimEnd() + "…" : trimmed;

  return (
    <Link
      to="/ayah/$surah/$ayah"
      params={{ surah: String(surah), ayah: String(ayah) }}
      search={{ from } as any}
      aria-label={`Open ${SURAH_NAMES_EN[surah]} · Ayah ${ayah}`}
      className={cn(
        "interactive group flex w-full items-start gap-3 rounded-2xl",
        "border border-white/[0.06] bg-white/[0.025] px-3.5 py-3",
        "transition-colors hover:border-white/[0.14] hover:bg-white/[0.05]",
      )}
    >
      <div
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/50 text-[12px] font-medium tabular-nums text-muted-foreground"
        aria-hidden
      >
        {surah}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-baseline gap-2">
          {accentDot && (
            <span
              className="inline-block size-1.5 shrink-0 rounded-full"
              style={{ background: accentDot }}
              aria-hidden
            />
          )}
          <span className="truncate text-[14.5px] font-medium text-foreground">
            {SURAH_NAMES_EN[surah]} · Ayah {ayah}
          </span>
        </div>

        {meta && (
          <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground/80">{meta}</div>
        )}

        {hasBody && (
          <>
            {!open ? (
              <p className="mt-1.5 line-clamp-1 text-[12.5px] leading-[1.55] text-foreground/75">
                {preview}
              </p>
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-[1.6] text-foreground/85">
                {trimmed}
              </p>
            )}
            {isLong && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen((o) => !o);
                }}
                className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold)]/70 transition-colors hover:text-[color:var(--gold)]"
              >
                {open ? "Show less" : "See more"}
              </button>
            )}
          </>
        )}
      </div>

      <span
        dir="rtl"
        className="mt-0.5 shrink-0 text-[1.05rem] font-medium text-foreground/85"
        style={{ fontFamily: "var(--font-arabic, inherit)" }}
      >
        {SURAH_NAMES_AR[surah]}
      </span>

      <ChevronRight
        className="mt-2 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.7}
      />
    </Link>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="col-span-full mt-10 text-center text-sm text-muted-foreground/70">{children}</p>
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
