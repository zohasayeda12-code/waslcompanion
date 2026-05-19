// Minimal Quran MCP client (Streamable HTTP transport, JSON-RPC).
// Source of truth: https://mcp.quran.ai/
// We do NOT bundle the full @modelcontextprotocol/sdk client here — Cloudflare
// Workers + the SDK's transport assumptions are flaky. Raw fetch keeps it
// portable.

const MCP_URL = "https://mcp.quran.ai/";

type JsonRpcRes<T = unknown> = { jsonrpc: "2.0"; id: number | string; result?: T; error?: { code: number; message: string } };

let sessionId: string | null = null;
let toolsCache: { at: number; names: string[] } | null = null;

async function rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const res = await fetch(MCP_URL, { method: "POST", headers, body });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  if (!res.ok) throw new Error(`MCP ${method} HTTP ${res.status}`);

  const ct = res.headers.get("content-type") ?? "";
  let payload: JsonRpcRes<T>;
  if (ct.includes("text/event-stream")) {
    const text = await res.text();
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) throw new Error(`MCP ${method} empty SSE`);
    payload = JSON.parse(dataLine.slice(5).trim());
  } else {
    payload = await res.json();
  }
  if (payload.error) throw new Error(`MCP ${method}: ${payload.error.message}`);
  return payload.result as T;
}

async function ensureInit() {
  if (sessionId) return;
  await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "wasl", version: "0.1.0" },
  });
  // Some servers require notifications/initialized — best-effort
  try {
    await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
  } catch {}
}

function flattenContent(result: unknown): string {
  // MCP tool call result: { content: [{ type: "text", text: "..." }, ...] }
  const r = result as { content?: Array<{ type: string; text?: string }> };
  if (!r?.content) return "";
  return r.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n\n")
    .trim();
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  await ensureInit();
  try {
    const result = await rpc<{ isError?: boolean }>("tools/call", { name, arguments: args });
    if ((result as { isError?: boolean })?.isError) return "";
    return flattenContent(result);
  } catch (e) {
    console.warn(`MCP tool ${name} failed`, String(e));
    return "";
  }
}

/** Fetch grounded context for an ayah from Quran MCP. Returns plain text or "". */
export async function fetchQuranMcpContext(surah: number, ayah: number): Promise<string> {
  try {
    await ensureInit();
    const verseKey = `${surah}:${ayah}`;
    const out: string[] = [];

    const tr = await callTool("fetch_translation", { ayahs: [verseKey] });
    if (tr) out.push(`Translation:\n${tr}`);

    const tf = await callTool("fetch_tafsir", { ayahs: [verseKey], editions: ["en-ibn-kathir"] });
    if (tf) out.push(`Tafsir (Ibn Kathir, abridged):\n${tf}`);

    return out.join("\n\n---\n\n").slice(0, 8000);
  } catch (e) {
    console.warn("fetchQuranMcpContext failed", String(e));
    return "";
  }
}
