import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { computeDailySunnah, getHijriToday, type SunnahKind } from "@/lib/hijri-sunnah";
import { SURAH_START_PAGE } from "@/lib/quran-structure";

// Maps a recitation suggestion to a Quran reader page.
function recitationTarget(label: string | undefined): { page: number } | null {
  if (!label) return null;
  const surah =
    /kahf/i.test(label) ? 18
    : /mulk/i.test(label) ? 67
    : /kursī|kursi/i.test(label) ? 2
    : /ikhl[āa]ṣ|ikhlas|falaq|n[āa]s/i.test(label) ? 112
    : null;
  if (!surah) return null;
  const page = SURAH_START_PAGE[surah];
  return page ? { page } : null;
}

/**
 * HijriBanner — today's Hijri date + a gentle "what is today good for?".
 *
 * Data is fully offline:
 *   • Hijri date comes from `Intl.DateTimeFormat("en-u-ca-islamic-umalqura")`.
 *   • The day's recommendations come from `computeDailySunnah()` — a small,
 *     local rules engine in `src/lib/hijri-sunnah.ts`.
 *
 * Layout: compact by default (date chip + one-line headline). Tap to expand
 * for the full day's sunnah, recitation suggestion, and a regional-sighting
 * note on edge days. Nothing is gamified or guilt-inducing — every item is
 * framed as an invitation.
 */
export function HijriBanner() {
  const today = useMemo(() => getHijriToday(), []);
  const sunnah = useMemo(() => computeDailySunnah(today), [today]);
  const [open, setOpen] = useState(false);

  const { month, day, year } = today;
  const compactLine = sunnah.headline ?? sunnah.monthNote ?? "—";

  return (
    <section
      aria-label="Today in the Hijri calendar"
      className="relative overflow-hidden rounded-2xl border border-white/[0.06]"
      style={{
        background:
          "linear-gradient(140deg, oklch(0.24 0.04 270 / 0.55), oklch(0.20 0.03 280 / 0.35))",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-25 blur-2xl"
        style={{ background: "var(--gradient-gold-glow)" }}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex size-9 flex-col items-center justify-center rounded-xl bg-white/5 text-center">
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground leading-none">
            {year}
          </span>
          <span
            className="mt-0.5 text-sm font-medium text-[color:var(--gold)] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {day || "—"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {month || "Hijri"} · today
          </p>
          <p className="mt-0.5 truncate text-sm font-medium tracking-tight text-foreground/95">
            {compactLine}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-foreground/50 transition-transform duration-500",
            open && "rotate-180 text-foreground/80",
          )}
          strokeWidth={1.6}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="sunnah-detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden"
          >
            <div className="space-y-4 border-t border-white/[0.05] px-4 py-4">
              {sunnah.monthNote && (
                <p className="text-xs leading-relaxed text-foreground/70">
                  {sunnah.monthNote}
                </p>
              )}

              <ul className="space-y-3">
                {sunnah.items.map((it) => (
                  <li key={it.id} className="flex gap-3">
                    <KindDot kind={it.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-[13px] font-medium text-foreground/95">
                          {it.label}
                        </p>
                        <KindBadge kind={it.kind} />
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-foreground/65">
                        {it.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {sunnah.recitation && (() => {
                const target = recitationTarget(sunnah.recitation.label);
                const content = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Recitation today
                      </p>
                      {target && (
                        <ArrowUpRight className="size-3.5 text-[color:var(--gold)]/80" strokeWidth={1.8} />
                      )}
                    </div>
                    <p className="mt-1 text-[13px] font-medium text-foreground/95">
                      {sunnah.recitation.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-foreground/65">
                      {sunnah.recitation.detail}
                    </p>
                  </>
                );
                const wrapClass =
                  "block rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]";
                return target ? (
                  <Link
                    to="/quran/page/$page"
                    params={{ page: String(target.page) }}
                    className={wrapClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={wrapClass}>{content}</div>
                );
              })()}

              {sunnah.regionalNote && (
                <p className="text-[11px] leading-relaxed text-foreground/45">
                  {sunnah.regionalNote}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function KindDot({ kind }: { kind: SunnahKind }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-1.5 size-1.5 shrink-0 rounded-full",
        kind === "sunnah"
          ? "bg-[color:var(--gold)] shadow-[0_0_8px_oklch(0.82_0.14_82_/_0.7)]"
          : "bg-foreground/30",
      )}
    />
  );
}

function KindBadge({ kind }: { kind: SunnahKind }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[9px] uppercase tracking-[0.16em]",
        kind === "sunnah"
          ? "border border-[color:var(--gold)]/30 text-[color:var(--gold)]/85"
          : "border border-white/10 text-foreground/45",
      )}
    >
      {kind === "sunnah" ? "Sunnah" : "Encouraged"}
    </span>
  );
}
