/**
 * Hijri Sunnah engine.
 *
 * Pure, offline rules that turn a Hijri date + Gregorian weekday into a
 * gentle list of recommended acts for today. Tone is intentionally calm:
 * everything is optional, framed as an invitation, not an obligation.
 *
 * We distinguish two kinds:
 *  - "sunnah"     — practices established in authentic prophetic tradition
 *  - "encouraged" — general reminders / broadly-recommended acts
 *
 * Hijri months we recognise (via Intl umalqura) are normalised by
 * `normalizeMonth()` below. Day boundaries can vary slightly by region —
 * we surface a quiet note on edge days so users can defer to their local
 * moon-sighting.
 */

export type SunnahKind = "sunnah" | "encouraged";

export type SunnahItem = {
  id: string;
  kind: SunnahKind;
  label: string;
  /** A single calm sentence explaining the practice. */
  detail: string;
};

export type DailySunnah = {
  /** A short headline action for the compact card. */
  headline: string | null;
  /** Month-level virtue / context line. */
  monthNote: string | null;
  /** Prioritised list of today's recommendations. */
  items: SunnahItem[];
  /** What to read today (used by Home / journey). */
  recitation: {
    label: string;
    detail: string;
  } | null;
  /** Quiet note when Hijri date may vary locally. */
  regionalNote: string | null;
};

const MONTH_VIRTUE: Record<string, string> = {
  Muharram: "A sacred month — the year opens with stillness and intention.",
  Safar: "A quiet month — let it carry steady remembrance.",
  "Rabiʿ I": "The month of the Prophet ﷺ — send abundant ṣalawāt.",
  "Rabiʿ II": "Soften the heart with consistent dhikr.",
  "Jumada I": "Return to small, sincere acts.",
  "Jumada II": "Renew intention; quiet steps draw near.",
  Rajab: "A sacred month — prepare the soul for what is coming.",
  Shaʿban: "The Prophet ﷺ fasted much of this month.",
  Ramadan: "The month of the Qurʾān — fast, recite, draw close.",
  Shawwal: "Six fasts of Shawwāl follow Ramaḍān in reward.",
  "Dhul Qaʿdah": "A sacred month — guard the tongue and limbs.",
  "Dhul Hijjah": "The best ten days — multiply quiet good.",
};

const SACRED_MONTHS = new Set(["Muharram", "Rajab", "Dhul Qaʿdah", "Dhul Hijjah"]);

const HIJRI_NAME_MAP: Record<string, string> = {
  Muharram: "Muharram",
  Safar: "Safar",
  "Rabiʻ I": "Rabiʿ I",
  "Rabiʻ II": "Rabiʿ II",
  "Jumada I": "Jumada I",
  "Jumada II": "Jumada II",
  Rajab: "Rajab",
  "Shaʻban": "Shaʿban",
  Ramadan: "Ramadan",
  Shawwal: "Shawwal",
  "Dhuʻl-Qiʻdah": "Dhul Qaʿdah",
  "Dhuʻl-Hijjah": "Dhul Hijjah",
};

export type HijriToday = {
  month: string;
  day: number;
  year: string;
  weekday: number; // 0=Sun … 5=Fri … 6=Sat
  hour: number; // 0-23, local
};

export function getHijriToday(now = new Date()): HijriToday {
  try {
    const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const parts = fmt.formatToParts(now);
    const rawMonth = parts.find((p) => p.type === "month")?.value ?? "";
    const dayStr = parts.find((p) => p.type === "day")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    return {
      month: HIJRI_NAME_MAP[rawMonth] ?? rawMonth,
      day: parseInt(dayStr, 10) || 0,
      year,
      weekday: now.getDay(),
      hour: now.getHours(),
    };
  } catch {
    return { month: "", day: 0, year: "", weekday: now.getDay(), hour: now.getHours() };
  }
}

export function computeDailySunnah(today: HijriToday): DailySunnah {
  const items: SunnahItem[] = [];
  const { month, day, weekday, hour } = today;
  let headline: string | null = null;
  let recitation: DailySunnah["recitation"] = null;
  let regionalNote: string | null = null;

  // — Recitation — gently surfaced by time of day / day of week ————
  if (weekday === 5) {
    recitation = {
      label: "Sūrah al-Kahf",
      detail: "A light between this Friday and the next, for whoever recites it.",
    };
  } else if (month === "Ramadan") {
    recitation = {
      label: "One juzʾ today",
      detail: "A gentle rhythm of roughly a juzʾ a day completes the Qurʾān by month's end.",
    };
  } else if (hour >= 21 || hour < 4) {
    recitation = {
      label: "Āyat al-Kursī before sleep",
      detail: "A guardian remains with you through the night until morning.",
    };
  } else if (hour >= 19) {
    recitation = {
      label: "Sūrah al-Mulk tonight",
      detail: "The Prophet ﷺ would not sleep until he recited it — it intercedes for its reciter.",
    };
  } else if (hour >= 16) {
    recitation = {
      label: "al-Ikhlāṣ, al-Falaq, an-Nās",
      detail: "Three times each for the evening — suffices you against everything.",
    };
  } else if (hour >= 4 && hour < 11) {
    recitation = {
      label: "al-Ikhlāṣ, al-Falaq, an-Nās",
      detail: "Three times each for the morning — suffices you against everything.",
    };
  } else {
    recitation = {
      label: "A few quiet ayāt",
      detail: "A small, steady portion is more beloved than long, broken stretches.",
    };
  }


  // — Dhul Hijjah ————————————————————————————————————————
  if (month === "Dhul Hijjah") {
    if (day >= 1 && day <= 9) {
      headline = `Day ${day} of Dhul Ḥijjah — multiply quiet good`;
      items.push({
        id: "dhulhijjah-10",
        kind: "sunnah",
        label: "The first ten days",
        detail:
          "No days are more beloved to Allāh for righteous deeds than these — fasting, dhikr (takbīr, taḥmīd, tahlīl), charity, kindness.",
      });
      if (day === 9) {
        items.unshift({
          id: "arafah",
          kind: "sunnah",
          label: "Fast the Day of ʿArafah",
          detail:
            "For non-pilgrims, fasting today is reported to expiate the past and coming year.",
        });
        headline = "Day of ʿArafah — fast if you are able";
      } else {
        items.push({
          id: "dhulhijjah-fast",
          kind: "encouraged",
          label: "Fast if you can",
          detail:
            "Fasting in these days is from the practice of the Prophet ﷺ; even one or two days is good.",
        });
      }
    } else if (day === 10) {
      headline = "ʿEid al-Aḍḥā — a day of joy, not fasting";
      items.push({
        id: "eid-adha",
        kind: "sunnah",
        label: "ʿEid prayer & takbīr",
        detail: "Bathe, wear your best, eat after the prayer, and continue the takbīr.",
      });
    } else if (day >= 11 && day <= 13) {
      headline = `Day ${day} — Ayyām al-Tashrīq`;
      items.push({
        id: "tashriq",
        kind: "sunnah",
        label: "Days of remembrance",
        detail:
          "The Prophet ﷺ called these days of eating, drinking and dhikr. Fasting them is not permitted.",
      });
    }
  }

  // — Muḥarram ————————————————————————————————————————
  if (month === "Muharram") {
    if (day === 9 || day === 10) {
      headline =
        day === 10 ? "Day of ʿĀshūrāʾ — fast today" : "Tāsūʿāʾ — fast today and tomorrow";
      items.push({
        id: "ashura",
        kind: "sunnah",
        label: "Fast of ʿĀshūrāʾ",
        detail:
          "Reported to expiate the previous year. The Prophet ﷺ intended to also fast the 9th, to differ from those before.",
      });
    }
  }

  // — Shawwāl six fasts ————————————————————————————————
  if (month === "Shawwal" && day >= 2 && day <= 30) {
    items.push({
      id: "shawwal-6",
      kind: "sunnah",
      label: "Six fasts of Shawwāl",
      detail:
        "Whoever fasts Ramaḍān then follows it with six of Shawwāl, it is as if fasting the whole year. They need not be consecutive.",
    });
    if (!headline) headline = "Six of Shawwāl — anytime this month";
  }

  // — Shaʿbān ————————————————————————————————————————
  if (month === "Shaʿban" && day < 29) {
    items.push({
      id: "shaban-fast",
      kind: "encouraged",
      label: "Increase fasting",
      detail: "ʿĀʾisha رضي الله عنها said the Prophet ﷺ fasted most of Shaʿbān.",
    });
  }

  // — Ramaḍān ————————————————————————————————————————
  if (month === "Ramadan") {
    headline = `Day ${day} of Ramaḍān`;
    items.push({
      id: "ramadan-fast",
      kind: "sunnah",
      label: "Fast today",
      detail: "An obligation in Ramaḍān for those able; a witness for you on the Day.",
    });
    if (day >= 21) {
      items.push({
        id: "laylat-qadr",
        kind: "encouraged",
        label: "Seek Laylat al-Qadr",
        detail: "Especially in the odd nights of the last ten — stand in prayer, ask forgiveness.",
      });
    }
  }

  // — White days (13, 14, 15 of any month) ——————————————
  const isWhiteDay = day >= 13 && day <= 15;
  if (isWhiteDay && month !== "Dhul Hijjah") {
    items.push({
      id: "ayyam-bid",
      kind: "sunnah",
      label: "Ayyām al-Bīḍ — fast the white days",
      detail:
        "The Prophet ﷺ recommended fasting the 13th, 14th and 15th of every Hijri month.",
    });
    if (!headline) headline = `Ayyām al-Bīḍ — day ${day}`;
  }

  // — Monday / Thursday voluntary fast ——————————————————
  if ((weekday === 1 || weekday === 4) && month !== "Ramadan") {
    // Don't recommend fasting on ʿEid days or Tashrīq
    const isForbiddenFast =
      (month === "Dhul Hijjah" && day >= 10 && day <= 13) ||
      (month === "Shawwal" && day === 1);
    if (!isForbiddenFast) {
      items.push({
        id: "mon-thu",
        kind: "sunnah",
        label: weekday === 1 ? "Voluntary fast — Monday" : "Voluntary fast — Thursday",
        detail:
          "The Prophet ﷺ used to fast Mondays and Thursdays. Deeds are presented on these days.",
      });
    }
  }

  // — Friday additions ——————————————————————————————
  if (weekday === 5) {
    if (!headline) headline = "Jumuʿah — read Sūrah al-Kahf";
    items.push({
      id: "salawat-friday",
      kind: "sunnah",
      label: "Send abundant ṣalawāt",
      detail:
        "Increase ṣalāh upon the Prophet ﷺ today — it is shown to him from his ummah.",
    });
  }

  // — Sacred months gentle reminder ————————————————————
  if (SACRED_MONTHS.has(month) && items.length < 2) {
    items.push({
      id: "sacred-month",
      kind: "encouraged",
      label: "A sacred month",
      detail:
        "Wrongs weigh heavier and good is multiplied. Guard the tongue, the limbs, the heart.",
    });
  }

  // — Edge-day regional note ——————————————————————————
  if (day === 1 || day === 29 || day === 30) {
    regionalNote =
      "Hijri dates may differ by one day depending on local moon-sighting — follow your community.";
  }

  // Always offer at least one quiet companion
  if (items.length === 0) {
    items.push({
      id: "dhikr",
      kind: "encouraged",
      label: "A breath of dhikr",
      detail:
        "SubḥānAllāh, al-ḥamdulillāh, Allāhu akbar — light on the tongue, heavy on the scale.",
    });
  }

  return {
    headline,
    monthNote: MONTH_VIRTUE[month] ?? null,
    items,
    recitation,
    regionalNote,
  };
}
