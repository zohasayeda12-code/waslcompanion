import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getMushafPage } from "@/lib/qf-content.functions";
import { listBookmarks } from "@/lib/library.functions";
import { listHighlights } from "@/lib/highlights.functions";
import { useLongPress } from "@/hooks/use-long-press";

export type AyahHit = {
  surah: number;
  ayah: number;
  el: HTMLElement;
};

type Props = {
  pageNumber: number;
  onAyahClick: (hit: AyahHit) => void;
  onAyahLongPress: (hit: AyahHit) => void;
};

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabicNumber = (n: number) =>
  String(n).split("").map((d) => ARABIC_DIGITS[Number(d)] ?? d).join("");

export function MushafPage({ pageNumber, onAyahClick, onAyahLongPress }: Props) {
  const pageFn = useServerFn(getMushafPage);
  const bookmarksFn = useServerFn(listBookmarks);
  const highlightsFn = useServerFn(listHighlights);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["mushaf-page", pageNumber],
    queryFn: () => pageFn({ data: { page: pageNumber } }),
    staleTime: 60 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
  const { data: bookmarks = [] } = useQuery({
    queryKey: ["bookmarks-list"],
    queryFn: () => bookmarksFn(),
    staleTime: 30_000,
  });
  const { data: highlights = [] } = useQuery({
    queryKey: ["highlights-list"],
    queryFn: () => highlightsFn({ data: {} }),
    staleTime: 30_000,
  });

  const bookmarkSet = useMemo(
    () => new Set(bookmarks.map((b: any) => `${b.surah}:${b.ayah}`)),
    [bookmarks],
  );
  const highlightMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const h of highlights as any[]) m.set(`${h.surah}:${h.ayah}`, h.color);
    return m;
  }, [highlights]);

  // Auto-fit text inside the fixed mushaf frame (like a real book page).
  const frameRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [fontPx, setFontPx] = useState(30);

  useLayoutEffect(() => {
    if (!frameRef.current || !contentRef.current) return;
    const fit = () => {
      const frame = frameRef.current;
      const content = contentRef.current;
      if (!frame || !content) return;
      let lo = 14;
      let hi = 40;
      // Binary search the largest font size where content fits the frame.
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        content.style.fontSize = `${mid}px`;
        if (content.scrollHeight <= frame.clientHeight) lo = mid;
        else hi = mid;
      }
      setFontPx(Math.floor(lo));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frameRef.current);
    return () => ro.disconnect();
  }, [page, pageNumber]);

  return (
    <article className="mushaf-page mx-auto flex w-full max-w-[40rem] flex-col px-6 pb-6 pt-5 md:px-10 md:pb-10 md:pt-7"
      style={{ height: "calc(100dvh - 7.5rem)" }}>
      <header className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
        <span>Page {pageNumber}</span>
        {page?.juz && <span>Juz {page.juz}</span>}
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error || !page ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Couldn't load this page.</p>
          <p className="text-xs opacity-70">{(error as Error)?.message ?? "No data returned."}</p>
        </div>
      ) : page.verses.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No verses returned for page {pageNumber}.
        </div>
      ) : (
        <div ref={frameRef} className="relative flex-1 overflow-hidden">
          <div
            ref={contentRef}
            className="font-mushaf text-right"
            style={{ direction: "rtl", fontSize: `${fontPx}px`, lineHeight: 2.05 }}
          >
            {page.verses.map((v) => {
              const key = `${v.surah}:${v.ayah}`;
              const hl = highlightMap.get(key);
              const isBookmarked = bookmarkSet.has(key);
              return (
                <AyahInline
                  key={key}
                  surah={v.surah}
                  ayah={v.ayah}
                  text={v.textUthmani}
                  highlight={hl}
                  bookmarked={isBookmarked}
                  onAyahClick={onAyahClick}
                  onAyahLongPress={onAyahLongPress}
                />
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}

function AyahInline({
  surah,
  ayah,
  text,
  highlight,
  bookmarked,
  onAyahClick,
  onAyahLongPress,
}: {
  surah: number;
  ayah: number;
  text: string;
  highlight?: string;
  bookmarked: boolean;
  onAyahClick: (hit: AyahHit) => void;
  onAyahLongPress: (hit: AyahHit) => void;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const longPress = useLongPress(() => {
    if (ref.current) onAyahLongPress({ surah, ayah, el: ref.current });
  });

  const colorClass = highlight ? `hl-${highlight}` : "";

  return (
    <>
      <span
        ref={ref}
        className={`ayah-span ${colorClass}`}
        data-surah={surah}
        data-ayah={ayah}
        onClick={(e) => {
          e.stopPropagation();
          if (ref.current) onAyahClick({ surah, ayah, el: ref.current });
        }}
        {...longPress}
      >
        {text}
      </span>
      <span className="ayah-end" aria-hidden>
        ۝{toArabicNumber(ayah)}
      </span>
      {bookmarked && (
        <span
          className="mushaf-bookmark-dot"
          aria-label="Bookmarked"
          style={{
            display: "inline-block",
            width: "0.35em",
            height: "0.35em",
            marginInline: "0.1em",
            borderRadius: "9999px",
            background: "var(--gold)",
            verticalAlign: "super",
          }}
        />
      )}{" "}
    </>
  );
}
