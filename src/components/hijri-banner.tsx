import { useMemo } from "react";

const MONTH_META: Record<string, { virtue: string }> = {
  Muharram: { virtue: "A sacred month — fasting Ashura erases the past year." },
  Safar: { virtue: "A quiet month — let it carry steady remembrance." },
  "Rabiʿ I": { virtue: "The month of the Prophet ﷺ — send abundant ṣalawāt." },
  "Rabiʿ II": { virtue: "Soften the heart with consistent dhikr." },
  "Jumada I": { virtue: "Return to small, sincere acts." },
  "Jumada II": { virtue: "Renew intention; quiet steps draw near." },
  Rajab: { virtue: "A sacred month — prepare the soul for Ramadan." },
  Shaʿban: { virtue: "The Prophet ﷺ fasted most of this month." },
  Ramadan: { virtue: "The month of the Qurʾān — fast, recite, draw close." },
  Shawwal: { virtue: "Six fasts of Shawwāl follow Ramaḍān in reward." },
  "Dhul Qaʿdah": { virtue: "A sacred month — guard the tongue and limbs." },
  "Dhul Hijjah": { virtue: "The best ten days — multiply good deeds." },
};

const NAME_MAP: Record<string, string> = {
  "Muharram": "Muharram",
  "Safar": "Safar",
  "Rabiʻ I": "Rabiʿ I",
  "Rabiʻ II": "Rabiʿ II",
  "Jumada I": "Jumada I",
  "Jumada II": "Jumada II",
  "Rajab": "Rajab",
  "Shaʻban": "Shaʿban",
  "Ramadan": "Ramadan",
  "Shawwal": "Shawwal",
  "Dhuʻl-Qiʻdah": "Dhul Qaʿdah",
  "Dhuʻl-Hijjah": "Dhul Hijjah",
};

function getHijri(): { month: string; day: string; year: string } {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const parts = fmt.formatToParts(new Date());
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    return { month: NAME_MAP[month] ?? month, day, year };
  } catch {
    return { month: "", day: "", year: "" };
  }
}

export function HijriBanner() {
  const { month, day, year } = useMemo(getHijri, []);
  const meta = MONTH_META[month];

  return (
    <section
      aria-label="Hijri month"
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] px-4 py-3"
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
      <div className="relative flex items-center gap-3">
        <div className="flex size-9 flex-col items-center justify-center rounded-xl bg-white/5 text-center">
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground leading-none">
            {year}
          </span>
          <span
            className="mt-0.5 text-sm font-medium text-[color:var(--gold)] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {day}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Hijri month
          </p>
          <p className="mt-0.5 text-sm font-medium tracking-tight text-foreground/95">
            {month || "—"}
          </p>
        </div>
      </div>
      {meta && (
        <p className="relative mt-2 text-xs leading-relaxed text-foreground/70">
          {meta.virtue}
        </p>
      )}
    </section>
  );
}
