import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { BookOpen, Bookmark, Sparkles } from "lucide-react";
import { AmbientLiveGlow } from "@/components/ambient-live-glow";
// PrimaryLink replaced with inline Link to keep TanStack typed-route inference
import { getAyah } from "@/lib/qf-content.functions";
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

const COLORS = ["gold", "blue", "green", "purple"] as const;

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

  const { data: ayahData } = useQuery({ queryKey: ["ayah", s, a, "full"], queryFn: () => ayahFn({ data: { surah: s, ayah: a, includeTafsir: true } }) });
  const { data: intentions = [] } = useQuery({ queryKey: ["intentions", s, a], queryFn: () => intentionsFn({ data: { surah: s, ayah: a } }) });
  const { data: active } = useQuery({ queryKey: ["active-intention"], queryFn: () => activeFn() });
  const { data: journey } = useQuery({ queryKey: ["journey"], queryFn: () => journeyFn() });
  const { data: bookmark } = useQuery({ queryKey: ["bookmark", s, a], queryFn: () => bookmarkedFn({ data: { surah: s, ayah: a } }) });
  const { data: highlight } = useQuery({ queryKey: ["highlight", s, a], queryFn: () => getHighlightFn({ data: { surah: s, ayah: a } }) });

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
          {ayahData?.tafsir && ayahData.tafsir.text && (
            <button
              onClick={() => {
                const el = document.getElementById("tafsir-panel");
                if (el) el.toggleAttribute("open");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--gold)]/40 bg-[oklch(0.82_0.14_82_/_0.10)] px-3 py-1.5 text-xs font-medium text-[color:var(--gold)]"
              aria-label="Tafsir"
            >
              <BookOpen className="size-3.5" /> Tafsir
            </button>
          )}
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
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--violet)]/40 bg-[oklch(0.70_0.16_295_/_0.10)] px-3 py-1.5 text-xs font-medium text-[color:var(--violet)]"
            aria-label="Ask"
          >
            <Sparkles className="size-3.5" /> Ask
          </button>

          <span className="ml-1 hidden h-5 w-px bg-border/60 sm:inline-block" />

          {COLORS.map((c) => (
            <button
              key={c}
              onClick={async () => {
                const next = highlight?.color === c ? null : c;
                await setHighlightFn({ data: { surah: s, ayah: a, color: next } });
                qc.invalidateQueries({ queryKey: ["highlight", s, a] });
              }}
              aria-label={`Highlight ${c}`}
              className={`size-5 rounded-full border-2 ${highlight?.color === c ? "border-foreground" : "border-transparent"}`}
              style={{ background: c === "gold" ? "var(--gold)" : c === "blue" ? "oklch(0.78 0.08 240)" : c === "green" ? "oklch(0.75 0.10 150)" : "oklch(0.72 0.12 300)" }}
            />
          ))}
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

      {/* Tafsir collapsible */}
      {ayahData?.tafsir && ayahData.tafsir.text && (
        <details id="tafsir-panel" className="mt-4 rounded-3xl border border-border/60 bg-card/40 p-5 text-sm leading-relaxed backdrop-blur-sm">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]">
            Tafsir · {ayahData.tafsir.name}
          </summary>
          <div
            className="mt-3 text-foreground/85 [&_p]:mt-2"
            dangerouslySetInnerHTML={{ __html: ayahData.tafsir.text }}
          />
        </details>
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
