import { getWaslSession } from "./qf-session.server";

const CONTENT_BASE = process.env.QF_CONTENT_BASE_URL ?? "https://apis.quran.foundation/content/api/v4";

async function qfFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await getWaslSession();
  const token = session.data?.accessToken;
  if (!token) throw new Response("Unauthorized", { status: 401 });
  return fetch(`${CONTENT_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "x-auth-token": token,
      "x-client-id": process.env.QF_CLIENT_ID ?? "",
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
};

// Tiny in-memory chapter-name cache. Chapters never change.
const chapterCache = new Map<number, { name: string; nameArabic: string }>();

async function fetchChapterName(surah: number): Promise<{ name?: string; nameArabic?: string }> {
  const cached = chapterCache.get(surah);
  if (cached) return { name: cached.name, nameArabic: cached.nameArabic };
  try {
    const res = await qfFetch(`/chapters/${surah}`);
    if (!res.ok) return {};
    const j = (await res.json()) as any;
    const c = j.chapter ?? j;
    const name = c?.name_simple ?? c?.translated_name?.name ?? c?.name ?? "";
    const nameArabic = c?.name_arabic ?? "";
    if (name) chapterCache.set(surah, { name, nameArabic });
    return { name, nameArabic };
  } catch {
    return {};
  }
}

/**
 * Fetch a single ayah. Returns a graceful stub if the QF Content API is not
 * configured or the upstream call fails — keeps the app rendering while
 * content credentials are being wired up.
 */
export async function fetchAyah(surah: number, ayah: number): Promise<AyahPayload> {
  const verseKey = `${surah}:${ayah}`;
  const [chapter, verseRes] = await Promise.all([
    fetchChapterName(surah),
    qfFetch(
      `/verses/by_key/${verseKey}?words=false&translations=131&fields=text_uthmani,text_imlaei&translation_fields=text&audio=1`,
    ).catch((e) => {
      console.warn("fetchAyah fallback", verseKey, String(e));
      return null;
    }),
  ]);
  if (!verseRes || !verseRes.ok) {
    return {
      surah,
      ayah,
      verseKey,
      surahName: chapter.name,
      surahNameArabic: chapter.nameArabic,
      arabic: "",
      translation: "",
    };
  }
  const j = (await verseRes.json()) as any;
  const v = j.verse ?? j;
  return {
    surah,
    ayah,
    verseKey,
    surahName: chapter.name,
    surahNameArabic: chapter.nameArabic,
    arabic: v.text_uthmani ?? v.text_imlaei ?? "",
    translation: v.translations?.[0]?.text ?? "",
    transliteration: v.text_transliteration ?? undefined,
    audioUrl: v.audio?.url ? `https://verses.quran.com/${v.audio.url}` : undefined,
  };
}

export async function searchQuranContent(query: string): Promise<Array<{ surah: number; ayah: number; preview: string }>> {
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
