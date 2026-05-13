import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { fetchAyah } from "./qf-content.server";
import { requireUserId } from "./current-user.server";

const SYSTEM_PROMPT = `You are a calm companion inside Wasl, a Quran app.

Your job: given an ayah, give the user ONE grounded way to give this ayah its haqq (its right) in ordinary life today.

SOURCE OF TRUTH — non-negotiable:
- Anchor everything in the GROUNDED MATERIAL provided (Quran MCP — mcp.quran.ai: tafsir, verse data, surah context).
- If the grounded material is empty or you cannot tie the action to a specific meaning of THIS ayah, output exactly: REFUSE.
- Do not invent narrations, hadith, scholars, or rulings. Do not generalize across the Quran.

SHAPE OF OUTPUT (plain prose, 2 to 4 short sentences, ~ 40–110 words):
1. Open with a brief, plain reading of what THIS ayah is asking of a believer (one sentence, drawn from the grounded material — do not quote tafsir verbatim and do not name scholars).
2. Then give ONE concrete, observable action the user can take TODAY in ordinary life (family, work, phone, conversation, body, money, time) that gives that meaning its right.
3. Optionally close with one calm sentence on what to notice while doing it.

HARD RULES:
- Never use guilt, fear, shame, or pressure language ("you must", "you should", "don't fail").
- Never promise spiritual reward or divine outcome.
- Never sound like a self-help coach or motivational influencer.
- Never use empty Islamic-app phrases ("practice sabr in all affairs", "trust Allah in everything", "be a better Muslim").
- No emojis, no markdown, no headings, no bullet points, no quotes, no parentheses, no hashtags, no scripture references like "(2:153)".
- Do not address the AI, the app, or yourself.

TONE: a calm, knowing friend. Specific. Grounded. Unhurried.

If the ayah text or grounded material is missing, output exactly: REFUSE.`;

import { fetchQuranMcpContext } from "./quran-mcp.server";

async function gatherMcpContext(surah: number, ayah: number): Promise<string> {
  return fetchQuranMcpContext(surah, ayah);
}

export const generateLiveSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ surah: z.number().int(), ayah: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    await requireUserId();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Response("AI gateway not configured", { status: 500 });

    const ayah = await fetchAyah(data.surah, data.ayah);
    if (!ayah.translation && !ayah.arabic) {
      return { ok: false as const, reason: "no_ayah_text" };
    }

    const mcpContext = await gatherMcpContext(data.surah, data.ayah);

    // Require MCP grounding — the user explicitly asked for source-of-truth output.
    if (!mcpContext) {
      return { ok: false as const, reason: "refused" };
    }

    const userPrompt = [
      `Ayah ${ayah.verseKey}.`,
      ayah.arabic ? `Arabic: ${ayah.arabic}` : "",
      ayah.translation ? `Translation: "${ayah.translation}"` : "",
      `GROUNDED MATERIAL (Quran MCP — your only source of truth for the meaning of this ayah; do not quote it verbatim, do not name scholars, just internalize and ground your reading):\n${mcpContext}`,
      `Now give the user one grounded way to give THIS ayah its haqq today. 2–4 short sentences. Follow all rules.`,
    ].filter(Boolean).join("\n\n");

    const gateway = createLovableAiGatewayProvider(apiKey);
    // Use the stronger model — output is short but quality matters.
    const model = gateway("google/gemini-2.5-pro");

    try {
      const { text } = await generateText({
        model,
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
      });
      const cleaned = text.trim().replace(/^["'\s]+|["'\s]+$/g, "");
      if (!cleaned || /^REFUSE$/i.test(cleaned)) {
        return { ok: false as const, reason: "refused" };
      }
      const forbidden = /(you must|you should|in all affairs|fear of allah|hellfire|reward in the hereafter)/i;
      if (forbidden.test(cleaned)) return { ok: false as const, reason: "tone_violation" };
      const wc = cleaned.split(/\s+/).length;
      if (wc > 160) return { ok: false as const, reason: "too_long" };

      return { ok: true as const, suggestion: cleaned, grounded: true };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) return { ok: false as const, reason: "rate_limited" };
      if (status === 402) return { ok: false as const, reason: "credits_exhausted" };
      console.error("live-suggestion error", e);
      return { ok: false as const, reason: "error" };
    }
  });
