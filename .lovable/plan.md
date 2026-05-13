# Quran View — Digital Mushaf Implementation Plan

## Scope

Replace the current `/quran` placeholder with a true page-based mushaf reader. Continuous reading is the foreground; all interaction is contextual. This plan covers the reader itself, the contextual toolbar, Pure Quran Mode, and the seamless round-trip to the existing Ayah Detail screen. It does **not** touch My Ayahs, collections, or audio (those stay in the spec backlog).What matters most is preserving the visual arrangement, page identity, spacing rhythm, and reading atmosphere of a real mushaf while still keeping the experience digitally interactive. So the current page-based Madani layout approach using KFGQPC font, controlled RTL line rendering, virtualization, and contextual overlays is correct for Wasl. The Quran View should feel like a digital mushaf rather than a responsive Quran website, but interaction systems such as highlights, reflections, bookmarks, and the contextual toolbar should still remain smooth and native to the digital experience.

## Routes

- `/quran` → redirect to last-read page (default page 1)
- `/quran/page/:page` → mushaf reader, virtualized
- Existing `/ayah/:surah/:ayah` stays the "Expand" target — we add a `from=quran&page=N&scroll=Y` search-param contract so returning restores position

## Data model & sources

- **Page → ayahs**: Quran.Foundation `verses/by_page/:page` (Madani 15-line, 604 pages). Add `fetchPage(page)` in `src/lib/qf-content.server.ts` returning `{ pageNumber, lines, verses: [{ surah, ayah, text_uthmani, words: [...] }] }`. Cache per-page response in-memory on the server.
- **Last-read page**: extend `journey_state` with `last_mushaf_page int default 1`. Updated whenever the reader mounts or scrolls past a page boundary (debounced server fn).
- **Pure Mode**: `localStorage["wasl.pureMode"] = "1"|"0"` (per-device, per spec). No DB.
- **Highlights / bookmarks / reflections / intentions**: reuse existing tables and server fns. We only add a tiny "by page" batch fetcher so we can hydrate the visible pages efficiently.

## Page rendering

- Madani layout has 15 lines per page. We render each page as a centered card with the same aspect ratio as a real mushaf page; ayahs flow inline RTL within lines.
- **Font**: load KFGQPC Uthmanic Hafs Regular from a public CDN (`fonts.qurancdn.com` or a self-hosted copy in `/public/fonts/`) via `@font-face` in `styles.css` with `font-display: swap`. Preload the file on the `/quran/page/$page` route via `head().links`.
- Each ayah is a `<span data-surah data-ayah role="button" tabindex="0">…</span>` followed by an ayah-end glyph (۝ + Arabic-Indic digit). This gives us the "hotspot" the spec asks for without extra DOM.T he ayahs should primarily remain: Quran text first and interaction should be secondary.
  Meaning:
  - long-press still works,
  - hover still works,
  - toolbar still works,
  without semantically labeling every ayah as a button.
- Ayah-end glyph doubles as the visual anchor for the contextual toolbar.

## Virtualization

- Use `@tanstack/react-virtual` (already a peer of TanStack ecosystem; add if absent) with a vertical virtualizer over a synthetic 604-item list.
- `estimateSize` ≈ viewport-derived page height; we measure on first render and cache.
- `overscan: 1` (keep current ± 1 page mounted, per the user's "current + adjacent only" rule).
- Page data fetched via `useQueries` keyed `["mushaf-page", n]` for the visible window only; non-visible pages unload from React but stay in React Query cache (gcTime 5min).
- A small bottom HUD shows current page / juz / surah, derived from the topmost visible page.

## Scroll restoration (round-trip with Ayah Detail)

1. On Expand, navigate with `search: { from: "quran", page, scrollY: window.scrollY }`.
2. Ayah Detail's existing back action reads `from=quran` and routes back to `/quran/page/:page` with `?restore=Y`.
3. Reader, on mount, if `restore` is present, waits for the virtualizer's first measurement then `scrollTo(Y, { behavior: "instant" })`. Falls back to scrolling the page card into view if Y is stale.
4. Also persist `{ page, scrollY }` to `sessionStorage["wasl.mushaf.pos"]` on every scroll (rAF-throttled) so a hard refresh also restores.

## Contextual toolbar

- Single floating component `<AyahToolbar>` rendered at the root of the reader, positioned via Floating UI (`@floating-ui/react`, add if absent) anchored to the active ayah span.
- Triggers:
  - **Desktop**: `mouseenter` on ayah span → 250ms hover-intent delay → show. Hides on `mouseleave` of both ayah and toolbar (with a small bridge).
  - **Mobile**: long-press (500ms, cancelled by scroll/move > 8px). Tap alone does nothing — preserves scrolling and matches the "reverent" choice. First-run hint toast: "Long-press an ayah to interact."
- Five icon buttons in this order: Reflection, Live This Ayah, Bookmark, Expand, Highlight. Each has an aria-label.
- Toolbar auto-flips above/below the ayah depending on space; arrow points at the ayah-end glyph.
- Pure Mode hides the toolbar entirely and removes the `cursor: pointer` affordance.

### Per-action behavior

- **Reflection** → opens an inline `<Popover>` directly under the ayah. Loads from `reflections_local` for that surah/ayah (most recent). Empty state: "No reflection yet." Actions: write / save / edit / delete with a relative timestamp ("Written 2 days ago"). All optimistic via existing `reflections_local` server fns; we add `getReflectionForAyah` and `upsertReflection` / `deleteReflection` if not present.
- **Live This Ayah** → opens a small `<Sheet>` (bottom sheet on mobile, side sheet on desktop) using `listIntentionsForAyah`. Renders state badges (active / carried / paused / lived / removed), reminder time, lived timestamp, carry-forward count. If none → "No intention yet" + a button that calls existing flow on `/live/:surah/:ayah`. If this ayah is the current `getActiveIntention`, the icon gets a subtle glow class.
- **Bookmark** → toggles `bookmarks_local` for surah/ayah optimistically. Filled bookmark icon when present.
- **Expand** → `navigate({ to: "/ayah/$surah/$ayah", params, search: { from: "quran", page, scrollY } })`.
- **Highlight** → opens a 6-swatch picker (Gold / Blue / Green / Purple / Rose / Remove) using existing `highlights` table + `setHighlight` / `removeHighlight` server fns. Highlight is rendered as a soft `background: color-mix(in oklab, var(--hl-x) 18%, transparent)` underline-ish wash on the ayah span — never a loud block.

## Pure Quran Mode

- Toggle in a discreet header button (eye icon) on `/quran/page/:page`.
- When on:
  - Body class `pure-mode` removes highlight backgrounds, bookmark dots, and active-intention glow via CSS.
  - Toolbar trigger handlers short-circuit (no hover, no long-press).
  - Header chrome fades to a minimal state.
- Persisted in localStorage; read on mount with SSR-safe guard.

## Visual design

- Page card: cream-tinted surface (`oklch(0.98 0.01 85)` light / a deep ink `oklch(0.16 0.01 250)` dark), inner padding mirroring mushaf margins, very subtle paper texture via SVG noise mask at 4% opacity.
- Ayah-end glyph in a slightly muted accent.
- Highlight colors live as semantic tokens in `styles.css`:
  - `--hl-gold`, `--hl-blue`, `--hl-green`, `--hl-purple`, `--hl-rose`.
- Toolbar: rounded-full bar, backdrop-blur, border `border/60`, shadow-sm, animates in with a 120ms scale+fade (Framer Motion, already used).
- Typography: KFGQPC for Arabic, existing Inter for UI chrome. No translation/tafsir on this screen.

## Server functions to add

- `qf-content.server.ts`: `fetchPage(pageNumber)` (QF `verses/by_page`).
- `qf-content.functions.ts`: `getMushafPage` createServerFn wrapper.
- `journey.functions.ts`: `setLastMushafPage(page)` (debounced from client).
- `reflections.functions.ts` (new): `getReflectionForAyah`, `upsertReflection`, `deleteReflection` — small wrappers around `reflections_local` (reusing existing patterns from intentions).
- `bookmarks.functions.ts` (new or extend `library.functions.ts`): `toggleBookmark(surah, ayah)`.

## Migration

- Single migration: `ALTER TABLE journey_state ADD COLUMN last_mushaf_page int NOT NULL DEFAULT 1;`

## Files

**New**

- `src/routes/_authenticated/quran.page.$page.tsx` — the reader
- `src/components/mushaf/MushafPage.tsx` — single-page renderer
- `src/components/mushaf/AyahToolbar.tsx` — floating contextual toolbar
- `src/components/mushaf/ReflectionPopover.tsx`
- `src/components/mushaf/IntentionSheet.tsx`
- `src/components/mushaf/HighlightPicker.tsx`
- `src/components/mushaf/PureModeToggle.tsx`
- `src/hooks/use-long-press.ts`
- `src/hooks/use-pure-mode.ts`
- `src/lib/reflections.functions.ts`
- `src/lib/bookmarks.functions.ts`
- `public/fonts/UthmanicHafs.woff2` (KFGQPC)
- `supabase/migrations/<ts>_last_mushaf_page.sql`

**Edited**

- `src/routes/_authenticated/quran.tsx` → redirect to `/quran/page/:lastPage`
- `src/lib/qf-content.server.ts` + `qf-content.functions.ts` → page fetcher
- `src/lib/journey.functions.ts` → setLastMushafPage
- `src/routes/_authenticated/ayah.$surah.$ayah.tsx` → honor `from=quran` back behavior + carry `page`/`scrollY` through
- `src/styles.css` → font-face, highlight tokens, pure-mode rules
- `package.json` → add `@tanstack/react-virtual`, `@floating-ui/react`

## Out of scope (explicitly deferred)

- Audio playback per ayah
- Juz/hizb navigation UI (data is captured but no picker yet)
- Khatam progress visualization
- Translation/tafsir overlays inside Quran View (those live in Ayah Detail)
- My Ayahs reorganization

## Acceptance criteria

1. `/quran` opens at the user's last-read mushaf page; default 1.
2. Scrolling between adjacent pages is smooth (no full 604-page mount).
3. Arabic renders in KFGQPC; no FOUT into a serif fallback after first load.
4. Long-press an ayah on mobile / hover an ayah on desktop reveals the 5-action toolbar near the ayah.
5. Reflection, Live, Bookmark, Highlight all work without leaving the page.
6. Expand opens Ayah Detail; back returns to the same page **and same scroll position**.
7. Pure Quran Mode hides every interaction affordance and personal state until disabled; setting persists across reloads on that device.
8. Hard-refresh on `/quran/page/N` restores the prior in-page scroll within ~1 frame.