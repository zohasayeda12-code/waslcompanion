import { qfConfig } from "./qf-config.server";

const CONTENT_BASE = process.env.QF_CONTENT_BASE_URL ?? "https://apis-prelive.quran.foundation/content/api/v4";
const CONTENT_TOKEN_URL = process.env.QF_CONTENT_TOKEN_URL ?? "https://prelive-oauth2.quran.foundation/oauth2/token";
const CONTENT_SCOPES = process.env.QF_CONTENT_SCOPES ?? "content";

// Cached client_credentials token for the Content API. Content API auth is
// independent from per-user OAuth — it uses an app-level token with the
// `content` scope.
let cachedContentToken: { token: string; expiresAt: number } | null = null;

async function getContentToken(): Promise<string> {
  if (cachedContentToken && cachedContentToken.expiresAt > Date.now() + 60_000) {
    return cachedContentToken.token;
  }
  const id = qfConfig.clientId;
  const secret = qfConfig.clientSecret;
  if (!id || !secret) throw new Error("QF_CLIENT_ID / QF_CLIENT_SECRET missing");

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "client_credentials", scope: CONTENT_SCOPES });
  const res = await fetch(CONTENT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`content token failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cachedContentToken = {
    token: j.access_token,
    expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
  return j.access_token;
}

async function qfFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getContentToken();
  return fetch(`${CONTENT_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "x-auth-token": token,
      "x-client-id": qfConfig.clientId,
      ...(init?.headers ?? {}),
    },
  });
}

export type AyahPayload = {
  surah: number;
  ayah: number;
  verseKey: string;
  surahName?: string;
  surahNameArabic?: string;
  arabic: string;
  translation: string;
  transliteration?: string;
  audioUrl?: string;
  tafsir?: { name: string; text: string } | null;
};

const chapterCache = new Map<number, { name: string; nameArabic: string }>();

async function fetchChapterName(surah: number): Promise<{ name?: string; nameArabic?: string }> {
  const cached = chapterCache.get(surah);
  if (cached) return { name: cached.name, nameArabic: cached.nameArabic };
  try {
    const res = await qfFetch(`/chapters/${surah}?language=en`);
    if (!res.ok) return {};
    const j = (await res.json()) as any;
    const c = j.chapter ?? j;
    const name = c?.name_simple ?? c?.translated_name?.name ?? c?.name ?? "";
    const nameArabic = c?.name_arabic ?? "";
    if (name) chapterCache.set(surah, { name, nameArabic });
    return { name, nameArabic };
  } catch (e) {
    console.warn("fetchChapterName failed", surah, String(e));
    return {};
  }
}

/**
 * Fetch a single ayah using the QF Content API.
 *  - /chapters/{id}            → surah name (en + ar)
 *  - /verses/by_key/{key}      → arabic + translation + transliteration
 *  - /chapter_recitations/7/{key} → audio (Mishary Alafasy reciter id 7)
 *  - /tafsirs/{id}/by_ayah/{key} → tafsir text (default 169 = Maarif-ul-Quran EN)
 */
export async function fetchAyah(
  surah: number,
  ayah: number,
  opts?: { translationId?: number; tafsirId?: number; reciterId?: number; includeTafsir?: boolean },
): Promise<AyahPayload> {
  const verseKey = `${surah}:${ayah}`;
  // Default = 85 (Abdel Haleem). The QF prelive Content API does not expose
  // translation 131 (Sahih International) — passing it returns no translations.
  const translationId = opts?.translationId ?? 85;
  const reciterId = opts?.reciterId ?? 7;
  const tafsirId = opts?.tafsirId ?? 169;

  const [chapter, verseRes, audioRes, tafsirRes] = await Promise.all([
    fetchChapterName(surah),
    qfFetch(
      `/verses/by_key/${verseKey}?language=en&words=true&translations=${translationId}&fields=text_uthmani,text_imlaei&word_fields=text_uthmani,transliteration&translation_fields=text,resource_name`,
    ).catch((e) => {
      console.warn("verses.by_key failed", verseKey, String(e));
      return null;
    }),
    // Use public quran.com API for audio — QF prelive only has reciter id 7.
    fetch(`https://api.quran.com/api/v4/recitations/${reciterId}/by_ayah/${verseKey}`, {
      headers: { Accept: "application/json" },
    }).catch((e) => {
      console.warn("[fetchAyah] quran.com audio fetch failed", reciterId, verseKey, String(e));
      return null;
    }),
    opts?.includeTafsir
      ? qfFetch(`/tafsirs/${tafsirId}/by_ayah/${verseKey}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  let arabic = "";
  let translation = "";
  let transliteration: string | undefined;

  if (verseRes && verseRes.ok) {
    const j = (await verseRes.json()) as any;
    const v = j.verse ?? j.verses?.[0] ?? j;
    arabic = v.text_uthmani ?? v.text_imlaei ?? "";
    const tr = Array.isArray(v.translations) ? v.translations[0] : v.translations;
    let tText = typeof tr === "string" ? tr : tr?.text ?? tr?.translation ?? "";
    if (tText) tText = String(tText).replace(/<[^>]+>/g, "").trim();
    translation = tText;
    if (Array.isArray(v.words)) {
      transliteration = v.words
        .map((w: any) => {
          const t = w.transliteration;
          if (!t) return "";
          if (typeof t === "string") return t;
          return typeof t.text === "string" ? t.text : "";
        })
        .filter(Boolean)
        .join(" ");
    }
    if (!translation) {
      console.warn("translation empty for", verseKey, "keys:", Object.keys(v ?? {}), "tr:", tr);
    }
  } else if (verseRes) {
    console.warn("verses.by_key non-ok", verseKey, verseRes.status, await verseRes.text().catch(() => ""));
  }

  let audioUrl: string | undefined;
  if (audioRes && audioRes.ok) {
    const j = (await audioRes.json()) as any;
    const list = j.audio_files ?? j.audio_file ?? [];
    const first = Array.isArray(list) ? list[0] : list;
    const url = first?.url ?? first?.audio_url;
    if (url) {
      const s = String(url);
      audioUrl = s.startsWith("http") ? s : `https://verses.quran.com/${s.replace(/^\/+/, "")}`;
    } else {
      console.warn("[fetchAyah] no audio url for reciter", reciterId, verseKey, "payload keys:", Object.keys(j ?? {}));
    }
  } else if (audioRes) {
    console.warn("[fetchAyah] recitations non-ok", reciterId, verseKey, audioRes.status, await audioRes.text().catch(() => ""));
  } else {
    console.warn("[fetchAyah] recitations fetch failed", reciterId, verseKey);
  }

  let tafsir: AyahPayload["tafsir"] = null;
  if (tafsirRes && tafsirRes.ok) {
    const j = (await tafsirRes.json()) as any;
    const t = j.tafsir ?? j.tafsirs?.[0];
    if (t) tafsir = { name: t.resource_name ?? t.translated_name?.name ?? "Tafsir", text: t.text ?? "" };
  }

  return {
    surah,
    ayah,
    verseKey,
    surahName: chapter.name,
    surahNameArabic: chapter.nameArabic,
    arabic,
    translation,
    transliteration: transliteration || undefined,
    audioUrl,
    tafsir,
  };
}

export type MushafPageVerse = {
  surah: number;
  ayah: number;
  verseKey: string;
  textUthmani: string;
  lineStart: number;
  lineEnd: number;
};

export type MushafPagePayload = {
  pageNumber: number;
  juz?: number;
  verses: MushafPageVerse[];
};

const pageCache = new Map<number, { payload: MushafPagePayload; expiresAt: number }>();
const PAGE_TTL_MS = 60 * 60 * 1000;

/** Fetch all verses on a Madani mushaf page (1..604). */
export async function fetchPage(pageNumber: number): Promise<MushafPagePayload> {
  const cached = pageCache.get(pageNumber);
  if (cached && cached.expiresAt > Date.now()) return cached.payload;

  const url = `/verses/by_page/${pageNumber}?language=en&per_page=50&fields=text_uthmani,page_number,juz_number`;
  const res = await qfFetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`verses.by_page failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as any;
  const verses = (j.verses ?? []) as any[];
  if (verses.length === 0) {
    console.warn("[fetchPage] empty verses for page", pageNumber, "response keys:", Object.keys(j), "raw:", JSON.stringify(j).slice(0, 500));
  }
  let juz: number | undefined;
  const out: MushafPageVerse[] = verses.map((v) => {
    const [s, a] = String(v.verse_key ?? "1:1").split(":").map(Number);
    if (!juz && v.juz_number) juz = v.juz_number;
    const words = Array.isArray(v.words) ? v.words.filter((w: any) => w.line_number) : [];
    const lineNumbers = words.map((w: any) => Number(w.line_number)).filter((n: number) => Number.isFinite(n));
    return {
      surah: s,
      ayah: a,
      verseKey: v.verse_key,
      textUthmani: v.text_uthmani ?? "",
      lineStart: lineNumbers.length ? Math.min(...lineNumbers) : 1,
      lineEnd: lineNumbers.length ? Math.max(...lineNumbers) : 1,
    };
  });

  const payload: MushafPagePayload = { pageNumber, juz, verses: out };
  pageCache.set(pageNumber, { payload, expiresAt: Date.now() + PAGE_TTL_MS });
  return payload;
}

export async function searchQuranContent(
  query: string,
): Promise<Array<{ surah: number; ayah: number; preview: string }>> {
  try {
    const res = await qfFetch(`/search?q=${encodeURIComponent(query)}&size=20&language=en`);
    if (!res.ok) return [];
    const j = (await res.json()) as any;
    const results = j.search?.results ?? [];
    return results.map((r: any) => {
      const [s, a] = String(r.verse_key ?? "1:1").split(":").map(Number);
      return { surah: s, ayah: a, preview: r.text ?? r.translations?.[0]?.text ?? "" };
    });
  } catch (e) {
    console.warn("searchQuranContent failed", e);
    return [];
  }
}
