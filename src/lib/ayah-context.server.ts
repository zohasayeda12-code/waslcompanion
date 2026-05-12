import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { fetchAyah } from "./qf-content.server";

const cache = new Map<string, { at: number; text: string }>();
const TTL = 24 * 60 * 60 * 1000;

export type AyahContext = {
  surah: number;
  ayah: number;
  verseKey: string;
  context: string;
};

export async function generateAyahContext(surah: number, ayah: number): Promise<AyahContext> {
  const verseKey = `${surah}:${ayah}`;
  const hit = cache.get(verseKey);
  if (hit && Date.now() - hit.at < TTL) {
    return { surah, ayah, verseKey, context: hit.text };
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return { surah, ayah, verseKey, context: "Context unavailable: AI gateway not configured." };
  }

  const ayahData = await fetchAyah(surah, ayah, { includeTafsir: false }).catch(() => null);
  const arabic = ayahData?.arabic ?? "";
  const translation = ayahData?.translation ?? "";
  const surahName = ayahData?.surahName ?? `Surah ${surah}`;

  const provider = createLovableAiGatewayProvider(apiKey);
  const model = provider.chatModel("google/gemini-2.5-flash");

  const prompt = `You are a careful Quranic scholar assistant. Provide a brief, accessible CONTEXT (Asbāb al-Nuzūl — reasons for revelation, and historical/situational background) for the following ayah.

Ayah: ${surahName} (${verseKey})
Arabic: ${arabic}
Translation: ${translation}

Write 3–5 short paragraphs, plain prose (no headings, no markdown). Cover:
- The historical setting / occasion of revelation if known (cite classical sources like Ibn Kathir, Wāhidī, Suyūṭī by name when relevant — no links).
- The immediate context within the surah.
- The core message and what it teaches.

If Asbāb al-Nuzūl is not specifically reported, say so honestly and give the surah-level context instead. Keep it neutral, faithful to mainstream Sunni scholarship, and avoid speculation.`;

  try {
    const { text } = await generateText({ model, prompt, temperature: 0.4 });
    const clean = text.trim();
    cache.set(verseKey, { at: Date.now(), text: clean });
    return { surah, ayah, verseKey, context: clean };
  } catch (e) {
    console.warn("generateAyahContext failed", verseKey, String(e));
    return { surah, ayah, verseKey, context: "Context could not be generated right now. Please try again." };
  }
}
