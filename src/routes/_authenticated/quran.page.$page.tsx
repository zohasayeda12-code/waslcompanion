import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { MushafPage, type AyahHit } from "@/components/mushaf/MushafPage";
import { AyahToolbar, type ToolbarAction } from "@/components/mushaf/AyahToolbar";
import { ReflectionPopover } from "@/components/mushaf/ReflectionPopover";
import { IntentionSheet } from "@/components/mushaf/IntentionSheet";
import { HighlightPicker } from "@/components/mushaf/HighlightPicker";

import { setLastMushafPage } from "@/lib/journey.functions";
import { getActiveIntention } from "@/lib/intentions.functions";
import { toggleBookmark, listBookmarks } from "@/lib/library.functions";
import { usePureMode } from "@/hooks/use-pure-mode";

const TOTAL_PAGES = 604;
const PAGE_PARAM = z.coerce.number().int().min(1).max(TOTAL_PAGES);

const searchSchema = z.object({
  restore: z.coerce.number().optional(),
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
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [pureMode, setPureMode] = usePureMode();
  const [direction, setDirection] = useState<1 | -1>(1);

  const [openHit, setOpenHit] = useState<AyahHit | null>(null);
  const [overlay, setOverlay] = useState<null | "reflection" | "highlight" | "live">(null);

  const lastPageFn = useServerFn(setLastMushafPage);
  const activeFn = useServerFn(getActiveIntention);
  const toggleBookmarkFn = useServerFn(toggleBookmark);
  const bookmarksFn = useServerFn(listBookmarks);

  const { data: active } = useQuery({ queryKey: ["active-intention"], queryFn: () => activeFn() });
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks-list"],
    queryFn: () => bookmarksFn(),
  });

  const bookmarkSet = useMemo(
    () => new Set(bookmarks.map((b: any) => `${b.surah}:${b.ayah}`)),
    [bookmarks],
  );

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

  const handleAction = async (action: ToolbarAction) => {
    if (!toolbarHit) return;
    const { surah, ayah } = toolbarHit;
    if (action === "reflection") {
      setOpenHit(toolbarHit);
      setOverlay("reflection");
      return;
    }
    if (action === "highlight") {
      setOpenHit(toolbarHit);
      setOverlay("highlight");
      return;
    }
    if (action === "live") {
      setOpenHit(toolbarHit);
      setOverlay("live");
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
      {/* Header */}
      <header className="sticky top-0 z-30 -mx-4 mb-2 flex items-center justify-between gap-3 bg-background/70 px-4 py-2 backdrop-blur-md">
        <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="interactive inline-flex size-7 items-center justify-center rounded-full bg-secondary/60 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular-nums">{page} / {TOTAL_PAGES}</span>
          <button
            onClick={() => goTo(page + 1)}
            disabled={page >= TOTAL_PAGES}
            aria-label="Next page"
            className="interactive inline-flex size-7 items-center justify-center rounded-full bg-secondary/60 disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setPureMode(!pureMode)}
            aria-label={pureMode ? "Exit Pure Quran Mode" : "Pure Quran Mode"}
            title={pureMode ? "Exit Pure Quran Mode" : "Pure Quran Mode"}
            className={`interactive ml-2 inline-flex size-7 items-center justify-center rounded-full ${
              pureMode ? "bg-primary/20 text-primary" : "bg-secondary/60"
            }`}
          >
            {pureMode ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </header>

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
              onAyahLongPress={pureMode ? () => {} : (h) => setOpenHit(h)}
            />
          </motion.div>
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
