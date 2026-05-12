import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, experimental_createMCPClient as createMCPClient, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { fetchAyah } from "./qf-content.server";

const SYSTEM_PROMPT = `You are a calm companion inside Wasl, a Quran app.

Your single job: given an ayah, suggest ONE small, concrete, realistic action a person can take TODAY to live this ayah in their daily life.

HARD RULES — never break:
- Never give fatwas, rulings, or theological certainty.
- Never use guilt, fear, shame, or pressure language ("you must", "you should", "don't fail").
- Never promise spiritual reward, paradise, or divine outcome.
- Never moralize, preach, or sound like a self-help coach or motivational influencer.
- Never use generic Islamic-app phrases ("practice sabr in all affairs", "trust Allah in everything", "be a better Muslim").
- Never explain the ayah, give tafsir, or quote scholars.
- Never reference yourself, the AI, or this app.

TONE: a calm friend. Short. Plain. Specific. Grounded in ordinary life.

OUTPUT SHAPE:
- One sentence, 6–14 words.
- Imperative mood, present-tense, observable today ("Pause before you reply once today.").
- Concrete behavior in a real situation (family, work, traffic, phone, conversation, food, sleep, money, body).
- No emojis, no quotes, no parentheses, no hashtags, no scripture references.

Examples of the RIGHT register (for an ayah on patience):
- "Pause for one breath before you reply to the next message."
- "Listen fully to one person today before you respond."
- "Delay one frustrated reaction by ten seconds."

Examples of the WRONG register — never produce these:
- "Practice sabr in all affairs of life."
- "Trust Allah and be patient with His decree."
- "Remember that patience brings reward in the hereafter."

If the ayah text is missing or you cannot anchor a concrete action in it, output exactly: REFUSE.`;

const McpUrl = process.env.QURAN_MCP_URL ?? "";

async function gatherMcpContext(surah: number, ayah: number): Promise<string> {
  if (!McpUrl) return "";
  let client: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  try {
    client = await createMCPClient({ transport: { type: "sse", url: McpUrl } });
    const tools = await client.tools();
    // Heuristic: try a likely tool name; if not present, skip silently.
    const toolName = Object.keys(tools).find((n) => /ayah|verse|tafsir|context/i.test(n));
    if (!toolName) return "";
    const tool = tools[toolName];
    const out = await tool.execute?.({ surah, ayah, verseKey: `${surah}:${ayah}` }, { toolCallId: "ctx", messages: [] } as any);
    return typeof out === "string" ? out : JSON.stringify(out).slice(0, 1500);
  } catch (e) {
    console.warn("MCP context skipped", String(e));
    return "";
  } finally {
    try { await client?.close?.(); } catch { /* noop */ }
  }
}

export const generateLiveSuggestion = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ surah: z.number().int(), ayah: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Response("AI gateway not configured", { status: 500 });

    const ayah = await fetchAyah(data.surah, data.ayah);
    if (!ayah.translation && !ayah.arabic) {
      return { ok: false as const, reason: "no_ayah_text" };
    }

    const mcpContext = await gatherMcpContext(data.surah, data.ayah);

    const userPrompt = [
      `Ayah ${ayah.verseKey}.`,
      ayah.translation ? `Translation: "${ayah.translation}"` : "",
      mcpContext ? `Grounded context (use only to anchor the action; do not quote):\n${mcpContext}` : "",
      `Suggest one small action for today. One sentence. Follow all rules.`,
    ].filter(Boolean).join("\n\n");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

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
      // Soft guardrails — block obvious bad patterns; ask user to write their own.
      const forbidden = /(you must|you should|in all affairs|fear of allah|hellfire|reward in the hereafter)/i;
      if (forbidden.test(cleaned)) return { ok: false as const, reason: "tone_violation" };
      if (cleaned.split(/\s+/).length > 24) return { ok: false as const, reason: "too_long" };

      return { ok: true as const, suggestion: cleaned, grounded: Boolean(mcpContext) };
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) return { ok: false as const, reason: "rate_limited" };
      if (status === 402) return { ok: false as const, reason: "credits_exhausted" };
      console.error("live-suggestion error", e);
      return { ok: false as const, reason: "error" };
    }
  });
