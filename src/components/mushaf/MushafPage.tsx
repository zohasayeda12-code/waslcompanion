import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef } from "react";
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
  onAyahHover: (hit: AyahHit | null) => void;
  onAyahLongPress: (hit: AyahHit) => void;
};

const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const toArabicNumber = (n: number) =>
  String(n).split("").map((d) => ARABIC_DIGITS[Number(d)] ?? d).join("");

export function MushafPage({ pageNumber, onAyahHover, onAyahLongPress }: Props) {
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

  return (
    <article className="mushaf-page mx-auto my-3 w-full max-w-[42rem] px-6 py-8 md:px-10 md:py-12">
      <header className="mb-6 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
        <span>Page {pageNumber}</span>
        {page?.juz && <span>Juz {page.juz}</span>}
      </header>

      {isLoading || !page ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <p
          className="font-mushaf text-right text-[1.85rem] leading-[2.6] md:text-[2.1rem] md:leading-[2.8]"
          style={{ direction: "rtl" }}
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
                onAyahHover={onAyahHover}
                onAyahLongPress={onAyahLongPress}
              />
            );
          })}
        </p>
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
  onAyahHover,
  onAyahLongPress,
}: {
  surah: number;
  ayah: number;
  text: string;
  highlight?: string;
  bookmarked: boolean;
  onAyahHover: (hit: AyahHit | null) => void;
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
        onMouseEnter={() => ref.current && onAyahHover({ surah, ayah, el: ref.current })}
        onMouseLeave={() => onAyahHover(null)}
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
