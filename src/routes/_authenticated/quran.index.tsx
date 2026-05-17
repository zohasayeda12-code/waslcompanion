import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Bookmark, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { getJourneyState } from "@/lib/journey.functions";
import {
  SURAH_NAMES_AR,
  SURAH_NAMES_EN,
  SURAH_AYAH_COUNTS,
  SURAH_START_PAGE,
  JUZ_INFO,
  juzAyahCount,
} from "@/lib/quran-structure";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quran/")({
  head: () => ({ meta: [{ title: "Quran — Wasl" }] }),
  component: QuranHub,
});

type Mode = "surah" | "juz";

function QuranHub() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("surah");

  const journeyFn = useServerFn(getJourneyState);
  const { data: journey } = useQuery({
    queryKey: ["journey-state"],
    queryFn: () => journeyFn(),
  });

  const marker = (journey as any)?.reading_marker as
    | { surah: number; ayah: number; page: number }
    | null
    | undefined;

  const lastPage = marker?.page ?? journey?.last_mushaf_page ?? 1;
  const lastSurah = marker?.surah ?? journey?.current_surah ?? 1;
  const lastAyah = marker?.ayah ?? journey?.current_ayah ?? 1;
  const hasMarker = !!marker;

  const goToPage = (page: number) => {
    navigate({
      to: "/quran/page/$page",
      params: { page: String(page) },
      search: {},
    });
  };

  const continueReading = () => {
    navigate({
      to: "/quran/page/$page",
      params: { page: String(lastPage) },
      search: hasMarker ? { marker: `${lastSurah}:${lastAyah}` } : {},
    });
  };

  return (
    <AppShell>
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[1.55rem] font-semibold tracking-tight">Quran</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            A gentle entry into your reading
          </p>
        </div>
        <Link
          to="/my-ayahs"
          aria-label="My Ayahs"
          className="interactive inline-flex size-9 items-center justify-center rounded-full bg-secondary/60 text-foreground/80"
        >
          <Bookmark className="size-[17px]" strokeWidth={1.6} />
        </Link>
      </header>

      {/* Continue Reading — the "thread marker" */}
      <button
        onClick={continueReading}
        className="block w-full text-left"
        aria-label={`Continue reading from page ${lastPage}, ayah ${lastSurah}:${lastAyah}`}
      >
        <GlassCard tone="strong" glow interactive className="overflow-hidden">
          <div className="flex items-center gap-4">
            {/* Marker thread accent */}
            <div className="relative flex h-14 w-1 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(180deg, oklch(0.82 0.14 82 / 0.9), oklch(0.82 0.14 82 / 0.15))",
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                {hasMarker ? "Return to your marker" : "Continue reading"}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className="truncate text-[1.05rem] font-medium text-foreground"
                  style={{ fontFamily: "var(--font-arabic, inherit)" }}
                  dir="rtl"
                >
                  {SURAH_NAMES_AR[lastSurah]}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {SURAH_NAMES_EN[lastSurah]}
                </span>
              </div>
              <div className="mt-0.5 text-xs tabular-nums text-muted-foreground/80">
                Page {lastPage} · Ayah {lastSurah}:{lastAyah}
              </div>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <BookOpen className="size-[18px]" strokeWidth={1.7} />
            </div>
          </div>
        </GlassCard>
      </button>

      {/* Segmented selector */}
      <div className="mt-7" role="tablist" aria-label="Browse by">
        <div className="relative mx-auto flex w-full max-w-[320px] rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md">
          {(["surah", "juz"] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(m)}
                className={cn(
                  "relative z-[1] flex-1 rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition-colors",
                  active ? "text-foreground" : "text-muted-foreground/70 hover:text-foreground/90",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="quran-mode-pill"
                    className="absolute inset-0 -z-[1] rounded-full bg-foreground/[0.08] shadow-[inset_0_1px_0_oklch(1_0_0_/_0.08)]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {m === "surah" ? "Read by Surah" : "Read by Juz"}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="mt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-x-4 md:gap-y-2.5"
          >
            {mode === "surah" ? <SurahList onOpen={goToPage} /> : <JuzList onOpen={goToPage} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

function Row({
  index,
  arabic,
  primary,
  secondary,
  onClick,
}: {
  index: number | string;
  arabic?: string;
  primary: string;
  secondary: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "interactive group flex w-full items-center gap-3 rounded-2xl",
        "border border-white/[0.06] bg-white/[0.025] px-3.5 py-3 md:py-2.5",
        "hover:border-white/[0.12] hover:bg-white/[0.045]",
        "transition-colors",
      )}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/50 text-[12px] font-medium tabular-nums text-muted-foreground"
        aria-hidden
      >
        {index}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[14.5px] font-medium text-foreground">{primary}</span>
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground/80">{secondary}</div>
      </div>

      {arabic && (
        <span
          dir="rtl"
          className="shrink-0 text-[1.05rem] font-medium text-foreground/85"
          style={{ fontFamily: "var(--font-arabic, inherit)" }}
        >
          {arabic}
        </span>
      )}

      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.7}
      />
    </button>
  );
}

function SurahList({ onOpen }: { onOpen: (page: number) => void }) {
  return (
    <>
      {Array.from({ length: 114 }, (_, i) => i + 1).map((s) => (
        <Row
          key={s}
          index={s}
          arabic={SURAH_NAMES_AR[s]}
          primary={SURAH_NAMES_EN[s]}
          secondary={`${SURAH_AYAH_COUNTS[s]} verses`}
          onClick={() => onOpen(SURAH_START_PAGE[s])}
        />
      ))}
    </>
  );
}

function JuzList({ onOpen }: { onOpen: (page: number) => void }) {
  return (
    <>
      {JUZ_INFO.map((j) => (
        <Row
          key={j.number}
          index={j.number}
          primary={j.name}
          secondary={`Begins ${j.startSurah}:${j.startAyah} · ${juzAyahCount(j.number)} verses`}
          onClick={() => onOpen(j.startPage)}
        />
      ))}
    </>
  );
}
