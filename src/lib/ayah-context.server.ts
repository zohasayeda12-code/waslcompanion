import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { fetchAyah } from "./qf-content.server";
import { fetchQuranMcpContext } from "./quran-mcp.server";

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

  const mcpGround = await fetchQuranMcpContext(surah, ayah);

  const provider = createLovableAiGatewayProvider(apiKey);
  const model = provider.chatModel("google/gemini-2.5-flash");

  const prompt = `You are a careful Quranic scholar assistant. Provide a brief, accessible CONTEXT (Asbāb al-Nuzūl — reasons for revelation, and historical/situational background) for the following ayah.

STRICT SOURCE RULE: Ground every factual claim in the GROUNDED MATERIAL below (from Quran MCP — mcp.quran.ai). Do not invent narrations. If a detail is not in the grounded material, say so plainly or omit it.

Ayah: ${surahName} (${verseKey})
Arabic: ${arabic}
Translation: ${translation}

GROUNDED MATERIAL (from Quran MCP):
${mcpGround || "(no MCP material returned — keep the response general and say Asbāb al-Nuzūl is not specifically reported here.)"}

Write 3–5 short paragraphs, plain prose (no headings, no markdown, no links). Cover the occasion of revelation if reported, the immediate context within the surah, and the core message.`;

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
