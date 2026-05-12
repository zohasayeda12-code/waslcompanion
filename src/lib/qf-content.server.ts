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
  const translationId = opts?.translationId ?? 131; // Sahih International
  const reciterId = opts?.reciterId ?? 7;
  const tafsirId = opts?.tafsirId ?? 169;

  const [chapter, verseRes, audioRes, tafsirRes] = await Promise.all([
    fetchChapterName(surah),
    qfFetch(
      `/verses/by_key/${verseKey}?words=true&translations=${translationId}&fields=text_uthmani,text_imlaei&word_fields=text_uthmani,transliteration&translation_fields=text`,
    ).catch((e) => {
      console.warn("verses.by_key failed", verseKey, String(e));
      return null;
    }),
    qfFetch(`/recitations/${reciterId}/by_ayah/${verseKey}`).catch(() => null),
    opts?.includeTafsir
      ? qfFetch(`/tafsirs/${tafsirId}/by_ayah/${verseKey}`).catch(() => null)
      : Promise.resolve(null),
  ]);

  let arabic = "";
  let translation = "";
  let transliteration: string | undefined;

  if (verseRes && verseRes.ok) {
    const j = (await verseRes.json()) as any;
    const v = j.verse ?? j;
    arabic = v.text_uthmani ?? v.text_imlaei ?? "";
    translation = v.translations?.[0]?.text ?? "";
    if (Array.isArray(v.words)) {
      transliteration = v.words
        .map((w: any) => w.transliteration?.text ?? w.transliteration ?? "")
        .filter(Boolean)
        .join(" ");
    }
  }

  let audioUrl: string | undefined;
  if (audioRes && audioRes.ok) {
    const j = (await audioRes.json()) as any;
    const list = j.audio_files ?? j.audio_file ?? [];
    const first = Array.isArray(list) ? list[0] : list;
    const url = first?.url ?? first?.audio_url;
    if (url) audioUrl = url.startsWith("http") ? url : `https://verses.quran.com/${url}`;
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
