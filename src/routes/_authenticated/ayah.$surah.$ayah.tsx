import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { BookOpen, Bookmark, Sparkles, Heart, ChevronDown } from "lucide-react";
import { AmbientLiveGlow } from "@/components/ambient-live-glow";
// PrimaryLink replaced with inline Link to keep TanStack typed-route inference
import { getAyah } from "@/lib/qf-content.functions";
import { getAyahContext } from "@/lib/ayah-context.functions";
import { listIntentionsForAyah, getActiveIntention, markLived, carryForward, removeIntention } from "@/lib/intentions.functions";
import { getJourneyState, advanceJourney } from "@/lib/journey.functions";
import { toggleBookmark, isBookmarked, recordRevisit } from "@/lib/library.functions";
import { setHighlight, getHighlight } from "@/lib/highlights.functions";

const search = z.object({
  from: z.enum(["home", "quran", "bookmarks", "highlights", "reflections", "collections", "search", "notification", "revisited", "my-ayahs"]).optional(),
  reflect: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/_authenticated/ayah/$surah/$ayah")({
  validateSearch: search,
  head: ({ params }) => ({ meta: [{ title: `${params.surah}:${params.ayah} — Wasl` }] }),
  component: AyahDetail,
});

type SheetKind = "tafsir" | "context" | null;

function AyahDetail() {
  const { surah, ayah } = Route.useParams();
  const { from } = Route.useSearch();
  const s = Number(surah);
  const a = Number(ayah);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const ayahFn = useServerFn(getAyah);
  const intentionsFn = useServerFn(listIntentionsForAyah);
  const activeFn = useServerFn(getActiveIntention);
  const journeyFn = useServerFn(getJourneyState);
  const advanceFn = useServerFn(advanceJourney);
  const bookmarkedFn = useServerFn(isBookmarked);
  const toggleBookmarkFn = useServerFn(toggleBookmark);
  const setHighlightFn = useServerFn(setHighlight);
  const getHighlightFn = useServerFn(getHighlight);
  const markLivedFn = useServerFn(markLived);
  const carryFn = useServerFn(carryForward);
  const removeFn = useServerFn(removeIntention);
  const revisitFn = useServerFn(recordRevisit);
  const contextFn = useServerFn(getAyahContext);

  const [sheet, setSheet] = useState<SheetKind>(null);

  const { data: ayahData } = useQuery({ queryKey: ["ayah", s, a, "full"], queryFn: () => ayahFn({ data: { surah: s, ayah: a, includeTafsir: true } }) });
  const { data: intentions = [] } = useQuery({ queryKey: ["intentions", s, a], queryFn: () => intentionsFn({ data: { surah: s, ayah: a } }) });
  const { data: active } = useQuery({ queryKey: ["active-intention"], queryFn: () => activeFn() });
  const { data: journey } = useQuery({ queryKey: ["journey"], queryFn: () => journeyFn() });
  const { data: bookmark } = useQuery({ queryKey: ["bookmark", s, a], queryFn: () => bookmarkedFn({ data: { surah: s, ayah: a } }) });
  const { data: highlight } = useQuery({ queryKey: ["highlight", s, a], queryFn: () => getHighlightFn({ data: { surah: s, ayah: a } }) });
  const { data: contextData, isLoading: contextLoading } = useQuery({
    queryKey: ["ayah-context", s, a],
    queryFn: () => contextFn({ data: { surah: s, ayah: a } }),
    enabled: sheet === "context",
    staleTime: 24 * 60 * 60 * 1000,
  });

  const isCurrent = journey?.current_surah === s && journey?.current_ayah === a;
  const activeForThis = active?.surah === s && active?.ayah === a ? active : null;

  useEffect(() => {
    if (from && from !== "home") {
      revisitFn({ data: { surah: s, ayah: a } }).catch(() => {});
    }
  }, [s, a, from, revisitFn]);

  const back = () => {
    const map: Record<string, string> = {
      quran: `/quran/${s}`,
      bookmarks: "/my-ayahs",
      highlights: "/my-ayahs",
      reflections: "/my-ayahs",
      collections: "/my-ayahs",
      search: "/search",
      "my-ayahs": "/my-ayahs",
      revisited: "/my-ayahs",
      notification: "/home",
      home: "/home",
    };
    navigate({ to: map[from ?? "home"] ?? "/home" });
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <button onClick={back} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{s}:{a}</span>
      </header>

      {!isCurrent && journey && (
        <Link
          to="/ayah/$surah/$ayah"
          params={{ surah: String(journey.current_surah), ayah: String(journey.current_ayah) }}
          search={{ from: "home" }}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/40 px-3 py-1 text-xs text-accent-foreground"
        >
          Current Journey: {journey.current_surah}:{journey.current_ayah} · Return →
        </Link>
      )}

      {/* Ayah card */}
      <section className="mt-6 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">
            {ayahData?.surahName ?? `Surah ${s}`}
            {ayahData?.surahNameArabic && (
              <span className="ml-2 text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {ayahData.surahNameArabic}
              </span>
            )}
          </p>
          <p className="text-xs tracking-[0.18em] text-[color:var(--emerald)]">{s}:{a}</p>
        </div>

        <p
          className="mt-6 text-center text-3xl leading-loose font-medium md:text-4xl"
          style={{ fontFamily: "var(--font-display)", direction: "rtl" }}
        >
          {ayahData?.arabic || "···"}
        </p>

        <div className="mt-6 h-px w-full bg-border/60" />

        {ayahData?.translation ? (
          <p className="mt-5 text-base italic leading-relaxed text-foreground/90">
            “{ayahData.translation}”
          </p>
        ) : ayahData ? (
          <p className="mt-5 text-sm italic text-muted-foreground">Translation unavailable.</p>
        ) : null}

        {ayahData?.transliteration && (
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--emerald)]/90">
            {ayahData.transliteration}
          </p>
        )}

        {/* Icon action row */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            to="/live/$surah/$ayah"
            params={{ surah, ayah }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--rose)]/40 bg-[oklch(0.72_0.16_15_/_0.10)] px-3 py-1.5 text-xs font-medium text-[color:var(--rose,oklch(0.72_0.16_15))]"
            aria-label="Live this ayah"
          >
            <Heart className="size-3.5" /> Live
          </Link>
          <button
            onClick={() => setSheet("tafsir")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--gold)]/40 bg-[oklch(0.82_0.14_82_/_0.10)] px-3 py-1.5 text-xs font-medium text-[color:var(--gold)]"
            aria-label="Tafsir"
          >
            <BookOpen className="size-3.5" /> Tafsir
          </button>
          <button
            onClick={async () => {
              await toggleBookmarkFn({ data: { surah: s, ayah: a } });
              qc.invalidateQueries({ queryKey: ["bookmark", s, a] });
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
              bookmark?.bookmarked
                ? "border-[color:var(--emerald)]/50 bg-[oklch(0.74_0.14_168_/_0.12)] text-[color:var(--emerald)]"
                : "border-border/60 bg-secondary/50 text-foreground/80"
            }`}
            aria-label="Bookmark"
          >
            <Bookmark className="size-3.5" /> {bookmark?.bookmarked ? "Bookmarked" : "Bookmark"}
          </button>
          <button
            onClick={() => setSheet("context")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--violet)]/40 bg-[oklch(0.70_0.16_295_/_0.10)] px-3 py-1.5 text-xs font-medium text-[color:var(--violet)]"
            aria-label="Context (Asbāb al-Nuzūl)"
          >
            <Sparkles className="size-3.5" /> Context
          </button>
        </div>
      </section>

      {/* Audio card */}
      {ayahData?.audioUrl && (
        <section className="mt-4 rounded-3xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
          <audio controls preload="none" src={ayahData.audioUrl} className="w-full">
            Your browser does not support audio playback.
          </audio>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Mishary Al-Afasy</p>
        </section>
      )}

      {/* Bottom sheet */}
      {sheet && (
        <BottomSheet
          title={sheet === "tafsir" ? `Tafsir · ${ayahData?.tafsir?.name ?? "Ibn Kathir"}` : "Context · Asbāb al-Nuzūl"}
          onClose={() => setSheet(null)}
        >
          {sheet === "tafsir" ? (
            ayahData?.tafsir?.text ? (
              <div
                className="text-sm leading-relaxed text-foreground/85 [&_p]:mt-2"
                dangerouslySetInnerHTML={{ __html: ayahData.tafsir.text }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Tafsir unavailable for this ayah.</p>
            )
          ) : contextLoading ? (
            <p className="text-sm text-muted-foreground">Generating context…</p>
          ) : contextData?.context ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
              {contextData.context}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No context available.</p>
          )}
        </BottomSheet>
      )}

      {/* Journey panel */}
      <section className="mt-8 rounded-3xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Journey</p>
        {intentions.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No intention set yet.</p>}
        {intentions.map((it) => (
          <div key={it.id} className="mt-3 rounded-2xl bg-secondary/60 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{it.status}</span>
              {it.lived_at && <span className="text-xs text-muted-foreground">{new Date(it.lived_at).toLocaleDateString()}</span>}
            </div>
            <p className="mt-1">{it.text}</p>
            {(it.status === "pending" || it.status === "awaiting_response" || it.status === "carried") && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={async () => {
                    await markLivedFn({ data: { intentionId: it.id } });
                    qc.invalidateQueries();
                  }}
                  className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
                >
                  Yes, lived it
                </button>
                <button
                  onClick={async () => {
                    await carryFn({ data: { intentionId: it.id } });
                    qc.invalidateQueries();
                  }}
                  className="rounded-full bg-accent/60 px-3 py-1 text-xs"
                >
                  Not yet — carry forward
                </button>
                <button
                  onClick={async () => {
                    await removeFn({ data: { intentionId: it.id } });
                    qc.invalidateQueries();
                  }}
                  className="rounded-full bg-secondary px-3 py-1 text-xs"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}

        <AmbientLiveGlow className="mt-5">
          <Link
            to="/live/$surah/$ayah"
            params={{ surah, ayah }}
            className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--gradient-primary)] px-6 text-base font-medium text-primary-foreground shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)]"
          >
            {intentions.some((i) => i.status === "lived") ? "Live This Ayah Again" : "Live This Ayah"}
          </Link>
        </AmbientLiveGlow>
      </section>

      {isCurrent && (
        <button
          onClick={async () => {
            await advanceFn({ data: { surah: s, ayah: a + 1 } });
            navigate({ to: "/ayah/$surah/$ayah", params: { surah, ayah: String(a + 1) }, search: { from: "home" } });
          }}
          className="mt-6 w-full rounded-2xl bg-secondary py-3 text-sm font-medium"
        >
          Next Ayah →
        </button>
      )}
    </AppShell>
  );
}

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative z-10 w-full max-w-2xl rounded-t-3xl border-t border-x border-border/60 bg-card shadow-[var(--shadow-elevated)]"
        style={{ transform: `translateY(${Math.max(0, dragY)}px)`, transition: startY === null ? "transform 200ms ease" : "none", maxHeight: "85vh" }}
        onTouchStart={(e) => setStartY(e.touches[0].clientY)}
        onTouchMove={(e) => {
          if (startY === null) return;
          const dy = e.touches[0].clientY - startY;
          setDragY(dy);
        }}
        onTouchEnd={() => {
          if (dragY > 120) {
            onClose();
          }
          setStartY(null);
          setDragY(0);
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-full bg-secondary/60 text-foreground/80 hover:text-foreground"
          >
            <ChevronDown className="size-5" />
          </button>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]">{title}</p>
          <span className="size-8" />
        </div>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border/70" />
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-8">{children}</div>
      </div>
    </div>
  );
}
