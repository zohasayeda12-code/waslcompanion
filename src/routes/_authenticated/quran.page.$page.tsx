import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";

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
  restore: fallback(z.coerce.number().optional(), undefined).optional(),
});

export const Route = createFileRoute("/_authenticated/quran/page/$page")({
  validateSearch: zodValidator(searchSchema),
  parseParams: (p) => ({ page: PAGE_PARAM.parse(p.page) }),
  stringifyParams: (p) => ({ page: String(p.page) }),
  head: ({ params }) => ({ meta: [{ title: `Mushaf · Page ${params.page} — Wasl` }] }),
  component: MushafReader,
});

function MushafReader() {
  const { page: startPage } = Route.useParams();
  const { restore } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [pureMode, setPureMode] = usePureMode();

  // Hover (desktop) and long-press (mobile) anchor + active surface
  const [hoverHit, setHoverHit] = useState<AyahHit | null>(null);
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

  // Virtualized list of mushaf pages
  const ESTIMATED_PAGE_HEIGHT = 920;
  const virtualizer = useWindowVirtualizer({
    count: TOTAL_PAGES,
    estimateSize: () => ESTIMATED_PAGE_HEIGHT,
    overscan: 1,
    initialOffset: 0,
  });

  // Scroll to start page on first mount
  const didInitialScroll = useRef(false);
  useEffect(() => {
    if (didInitialScroll.current) return;
    didInitialScroll.current = true;
    const idx = Math.max(0, startPage - 1);
    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(idx, { align: "start", behavior: "auto" });
      // Fine-tune with sessionStorage scrollY if returning from Ayah Detail
      if (restore != null) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: restore, behavior: "auto" });
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute current top page from virtualizer items, persist last-read + URL
  const items = virtualizer.getVirtualItems();
  const currentPage = items[0] ? items[0].index + 1 : startPage;
  const persistedRef = useRef(startPage);
  useEffect(() => {
    if (currentPage === persistedRef.current) return;
    persistedRef.current = currentPage;
    // Update URL silently
    navigate({
      to: "/quran/page/$page",
      params: { page: String(currentPage) },
      replace: true,
      search: {},
    });
    // Persist server-side (debounced via React effect throttling — fire and forget)
    lastPageFn({ data: { page: currentPage } }).catch(() => {});
    // sessionStorage for hard-refresh restore
    try {
      sessionStorage.setItem("wasl.mushaf.pos", JSON.stringify({ page: currentPage, scrollY: window.scrollY }));
    } catch {}
  }, [currentPage, lastPageFn, navigate]);

  // Persist scroll position continuously (rAF-throttled)
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(
            "wasl.mushaf.pos",
            JSON.stringify({ page: persistedRef.current, scrollY: window.scrollY }),
          );
        } catch {}
        raf = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Toolbar anchor: open overrides hover
  const toolbarHit = openHit ?? hoverHit;
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
      setHoverHit(null);
      return;
    }
    if (action === "expand") {
      try {
        sessionStorage.setItem(
          "wasl.mushaf.pos",
          JSON.stringify({ page: persistedRef.current, scrollY: window.scrollY }),
        );
      } catch {}
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
            onClick={() => {
              const p = Math.max(1, currentPage - 1);
              virtualizer.scrollToIndex(p - 1, { align: "start", behavior: "smooth" });
            }}
            aria-label="Previous page"
            className="interactive inline-flex size-7 items-center justify-center rounded-full bg-secondary/60"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular-nums">{currentPage} / {TOTAL_PAGES}</span>
          <button
            onClick={() => {
              const p = Math.min(TOTAL_PAGES, currentPage + 1);
              virtualizer.scrollToIndex(p - 1, { align: "start", behavior: "smooth" });
            }}
            aria-label="Next page"
            className="interactive inline-flex size-7 items-center justify-center rounded-full bg-secondary/60"
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

      {/* Virtualized mushaf */}
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {items.map((vi) => (
          <div
            key={vi.key}
            ref={virtualizer.measureElement}
            data-index={vi.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vi.start}px)`,
            }}
          >
            <MushafPage
              pageNumber={vi.index + 1}
              onAyahHover={pureMode ? () => {} : (h) => setHoverHit(h)}
              onAyahLongPress={pureMode ? () => {} : (h) => setOpenHit(h)}
            />
          </div>
        ))}
      </div>

      {/* Floating toolbar */}
      {!pureMode && toolbarHit && (
        <AyahToolbar
          anchor={toolbarHit.el}
          bookmarked={isBm}
          isActiveIntention={isActive}
          onAction={handleAction}
          onClose={() => {
            setHoverHit(null);
            // Don't close openHit unless overlay also closed
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
