import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { AmbientLiveGlow } from "@/components/ambient-live-glow";
import { PrimaryLink } from "@/components/primary-button";
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

  const { data: ayahData } = useQuery({ queryKey: ["ayah", s, a], queryFn: () => ayahFn({ data: { surah: s, ayah: a } }) });
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

      <section className="mt-8">
        <p className="text-3xl leading-relaxed font-medium md:text-4xl" style={{ fontFamily: "var(--font-display)", direction: "rtl" }}>
          {ayahData?.arabic || "···"}
        </p>
        {ayahData?.translation && <p className="mt-6 text-lg leading-relaxed text-foreground/90">{ayahData.translation}</p>}
        {ayahData?.transliteration && <p className="mt-3 text-sm italic text-muted-foreground">{ayahData.transliteration}</p>}
      </section>

      {/* Toolbar */}
      <section className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={async () => {
            await toggleBookmarkFn({ data: { surah: s, ayah: a } });
            qc.invalidateQueries({ queryKey: ["bookmark", s, a] });
          }}
          className={`rounded-full px-4 py-2 text-sm ${bookmark?.bookmarked ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
        >
          {bookmark?.bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={async () => {
              const next = highlight?.color === c ? null : c;
              await setHighlightFn({ data: { surah: s, ayah: a, color: next } });
              qc.invalidateQueries({ queryKey: ["highlight", s, a] });
            }}
            aria-label={`Highlight ${c}`}
            className={`size-7 rounded-full border-2 ${highlight?.color === c ? "border-foreground" : "border-transparent"}`}
            style={{ background: c === "gold" ? "var(--gold)" : c === "blue" ? "oklch(0.78 0.08 240)" : c === "green" ? "oklch(0.75 0.10 150)" : "oklch(0.72 0.12 300)" }}
          />
        ))}
      </section>

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
          <PrimaryLink to="/live/$surah/$ayah" params={{ surah, ayah }}>
            {intentions.some((i) => i.status === "lived") ? "Live This Ayah Again" : "Live This Ayah"}
          </PrimaryLink>
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
