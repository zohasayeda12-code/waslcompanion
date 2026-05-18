import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Feather, ChevronLeft, ChevronRight, Sun, Moon, BookOpen } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MushafPage, type AyahHit } from "@/components/mushaf/MushafPage";
import { AyahToolbar, type ToolbarAction } from "@/components/mushaf/AyahToolbar";
import { ReflectionPopover } from "@/components/mushaf/ReflectionPopover";
import { IntentionSheet } from "@/components/mushaf/IntentionSheet";
import { HighlightPicker } from "@/components/mushaf/HighlightPicker";
import { TranslationPopover } from "@/components/mushaf/TranslationPopover";

import { setLastMushafPage, setReadingMarker, getJourneyState } from "@/lib/journey.functions";
import { getActiveIntention } from "@/lib/intentions.functions";
import { toggleBookmark, listBookmarks } from "@/lib/library.functions";
import { usePureMode } from "@/hooks/use-pure-mode";
import { useMushafTheme } from "@/hooks/use-mushaf-theme";
import { useImmersiveWhen } from "@/hooks/use-immersive";

const TOTAL_PAGES = 604;
const PAGE_PARAM = z.coerce.number().int().min(1).max(TOTAL_PAGES);

const searchSchema = z.object({
  restore: z.coerce.number().optional(),
  marker: z.string().optional(), // "surah:ayah"
});

export const Route = createFileRoute("/_authenticated/quran/page/$page")({
  validateSearch: (s) => searchSchema.parse(s),
  parseParams: (p) => ({ page: PAGE_PARAM.parse(p.page) }),
  stringifyParams: (p) => ({ page: String(p.page) }),
  head: ({ params }) => ({ meta: [{ title: `Mushaf · Page ${params.page} — Wasl` }] }),
  component: MushafReader,
});

function MushafReader() {
  const { page } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [pureMode, setPureMode] = usePureMode();
  const [mushafTheme, setMushafTheme] = useMushafTheme();
  const [direction, setDirection] = useState<1 | -1>(1);

  const [openHit, setOpenHit] = useState<AyahHit | null>(null);
  const [overlay, setOverlay] = useState<null | "reflection" | "highlight" | "live" | "translation">(null);
  const [markerToast, setMarkerToast] = useState<string | null>(null);
  const [highlightAnchor, setHighlightAnchor] = useState<HTMLElement | null>(null);

  // Auto-hide bottom nav while any contextual reading UI is open.
  useImmersiveWhen(!!openHit || !!overlay);

  const lastPageFn = useServerFn(setLastMushafPage);
  const activeFn = useServerFn(getActiveIntention);
  const toggleBookmarkFn = useServerFn(toggleBookmark);
  const bookmarksFn = useServerFn(listBookmarks);
  const setMarkerFn = useServerFn(setReadingMarker);
  const journeyFn = useServerFn(getJourneyState);

  const { data: active } = useQuery({ queryKey: ["active-intention"], queryFn: () => activeFn() });
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks-list"],
    queryFn: () => bookmarksFn(),
  });
  const { data: journey } = useQuery({
    queryKey: ["journey-state"],
    queryFn: () => journeyFn(),
  });

  const marker = (journey as any)?.reading_marker ?? null;

  // Resume target from ?marker=surah:ayah
  const resumeKey = useMemo(() => {
    if (!search.marker) return null;
    const [s, a] = search.marker.split(":").map((n: string) => Number(n));
    if (!s || !a) return null;
    return { surah: s, ayah: a };
  }, [search.marker]);

  const bookmarkSet = useMemo(
    () => new Set(bookmarks.map((b: any) => `${b.surah}:${b.ayah}`)),
    [bookmarks],
  );

  const placeMarker = async (hit: AyahHit) => {
    setMarkerToast(`Marker placed at ${hit.surah}:${hit.ayah}`);
    window.setTimeout(() => setMarkerToast(null), 2200);
    try {
      await setMarkerFn({ data: { surah: hit.surah, ayah: hit.ayah, page } });
      qc.invalidateQueries({ queryKey: ["journey-state"] });
    } catch {}
  };

  // Persist last-read page on change
  useEffect(() => {
    lastPageFn({ data: { page } }).catch(() => {});
    try {
      sessionStorage.setItem("wasl.mushaf.pos", JSON.stringify({ page }));
    } catch {}
    // close any open overlays/toolbars when turning page
    setOpenHit(null);
    setOverlay(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [page, lastPageFn]);

  const goTo = (next: number) => {
    const target = Math.min(TOTAL_PAGES, Math.max(1, next));
    if (target === page) return;
    setDirection(target > page ? 1 : -1);
    navigate({
      to: "/quran/page/$page",
      params: { page: String(target) },
      search: {},
    });
  };

  // Prefetch neighbors (data hydrates inside MushafPage's useQuery cache)
  // Keyboard arrows turn pages
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if (e.key === "ArrowLeft") goTo(page + 1); // RTL: left = next
      if (e.key === "ArrowRight") goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page]);

  // Swipe navigation (mobile)
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    // RTL: swipe left → next page, swipe right → previous
    if (dx < 0) goTo(page + 1);
    else goTo(page - 1);
  };

  const toolbarHit = openHit;
  const isActive =
    !!active && toolbarHit ? active.surah === toolbarHit.surah && active.ayah === toolbarHit.ayah : false;
  const isBm = toolbarHit ? bookmarkSet.has(`${toolbarHit.surah}:${toolbarHit.ayah}`) : false;

  const handleAction = async (action: ToolbarAction, el?: HTMLElement) => {
    if (!toolbarHit) return;
    const { surah, ayah } = toolbarHit;
    if (action === "reflection") {
      setOpenHit(toolbarHit);
      setOverlay("reflection");
      return;
    }
    if (action === "highlight") {
      setOpenHit(toolbarHit);
      setHighlightAnchor(el ?? toolbarHit.el);
      setOverlay("highlight");
      return;
    }
    if (action === "live") {
      setOpenHit(toolbarHit);
      setOverlay("live");
      return;
    }
    if (action === "translation") {
      setOpenHit(toolbarHit);
      setOverlay("translation");
      return;
    }
    if (action === "bookmark") {
      await toggleBookmarkFn({ data: { surah, ayah } });
      qc.invalidateQueries({ queryKey: ["bookmarks-list"] });
      setOpenHit(null);
      return;
    }
    if (action === "expand") {
      navigate({
        to: "/ayah/$surah/$ayah",
        params: { surah: String(surah), ayah: String(ayah) },
        search: { from: "quran" },
      });
    }
  };

  return (
    <AppShell>
      {/* Header — glass bar aligned to the mushaf page width */}
      <div className="sticky top-0 z-30 -mx-4 mb-3 px-4 pt-2 pb-1">
        <header
          className="mx-auto flex w-full max-w-[52rem] items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 shadow-[0_8px_30px_-12px_oklch(0_0_0_/_0.5)] backdrop-blur-xl"
        >
          <Link
            to="/quran"
            className="interactive inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Quran
          </Link>
          <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <button
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="interactive inline-flex size-7 items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[3.2rem] text-center tabular-nums">{page} / {TOTAL_PAGES}</span>
            <button
              onClick={() => goTo(page + 1)}
              disabled={page >= TOTAL_PAGES}
              aria-label="Next page"
              className="interactive inline-flex size-7 items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
            <span aria-hidden className="mx-1 h-4 w-px bg-white/10" />
            <button
              onClick={() => setMushafTheme(mushafTheme === "night" ? "day" : "night")}
              aria-label={mushafTheme === "night" ? "Switch to Day Mushaf" : "Switch to Night Mushaf"}
              title={mushafTheme === "night" ? "Day Mushaf — warm parchment for daylight reading." : "Night Mushaf — soft dark page that's gentle on the eyes."}
              className="interactive inline-flex size-7 items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08]"
            >
              {mushafTheme === "night" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              onClick={() => setPureMode(!pureMode)}
              aria-label={pureMode ? "Exit Mushaf Mode" : "Mushaf Mode"}
              title={pureMode ? "Exit Mushaf Mode — return to reflections, highlights, and overlays." : "Mushaf Mode — read without reflections, highlights, or overlays. Double-tap any ayah to set your reading marker."}
              className={`interactive inline-flex size-7 items-center justify-center rounded-full ${
                pureMode
                  ? "bg-[color:var(--gold)]/15 text-[color:var(--gold)] shadow-[0_0_0_1px_color-mix(in_oklab,var(--gold)_25%,transparent)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              {pureMode ? <BookOpen className="size-4" /> : <Feather className="size-4" />}
            </button>
          </div>
        </header>
      </div>


      {/* Single mushaf page with page-turn animation */}
      <div
        className="relative min-h-[70vh] overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, x: direction === 1 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction === 1 ? -60 : 60 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <MushafPage
              pageNumber={page}
              onAyahClick={pureMode ? () => {} : (h) => setOpenHit(h)}
              onAyahLongPress={pureMode ? placeMarker : placeMarker}
              onAyahDoubleTap={placeMarker}
              marker={marker && marker.page === page ? { surah: marker.surah, ayah: marker.ayah } : null}
              resumeKey={resumeKey}
            />
          </motion.div>
        </AnimatePresence>

        {/* Soft marker confirmation */}
        <AnimatePresence>
          {markerToast && (
            <motion.div
              key={markerToast}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex justify-center"
            >
              <div className="rounded-full border border-white/10 bg-background/70 px-4 py-2 text-[12.5px] tracking-wide text-foreground/85 shadow-[0_8px_30px_oklch(0_0_0_/_0.35)] backdrop-blur-xl">
                <span className="mr-2 inline-block size-1.5 translate-y-[-1px] rounded-full bg-[var(--gold)]" />
                {markerToast}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating toolbar */}
      {!pureMode && toolbarHit && (
        <AyahToolbar
          anchor={toolbarHit.el}
          bookmarked={isBm}
          isActiveIntention={isActive}
          onAction={handleAction}
          onClose={() => {
            if (!overlay) setOpenHit(null);
          }}
        />
      )}

      {/* Overlays */}
      {openHit && overlay === "reflection" && (
        <ReflectionPopover
          anchor={openHit.el}
          surah={openHit.surah}
          ayah={openHit.ayah}
          onClose={() => {
            setOverlay(null);
            setOpenHit(null);
          }}
        />
      )}
      {openHit && overlay === "highlight" && (
        <HighlightPicker
          anchor={highlightAnchor ?? openHit.el}
          surah={openHit.surah}
          ayah={openHit.ayah}
          onClose={() => {
            setOverlay(null);
            setOpenHit(null);
            setHighlightAnchor(null);
          }}
        />
      )}
      {openHit && overlay === "translation" && (
        <TranslationPopover
          anchor={openHit.el}
          surah={openHit.surah}
          ayah={openHit.ayah}
          onClose={() => {
            setOverlay(null);
            setOpenHit(null);
          }}
        />
      )}
      {openHit && overlay === "live" && (
        <IntentionSheet
          surah={openHit.surah}
          ayah={openHit.ayah}
          onClose={() => {
            setOverlay(null);
            setOpenHit(null);
          }}
        />
      )}
    </AppShell>
  );
}
