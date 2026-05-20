# Wasl — AI-Quranic Companion

> A local-first, AI-enhanced Quran companion that helps Muslims read, reflect, and live the Quran — grounded in verified Quran Foundation sources, not AI hallucinations.

## What is Wasl?

Wasl is a progressive web app (PWA) designed for deep, daily Quran engagement. It combines a beautiful Mushaf reading experience with AI-powered contextual insights, all anchored in authenticated Quran Foundation tafsir and translation data. Every suggestion, reflection, and piece of context traces back to a real Quranic source.

**Published App:** https://waslcompanion.lovable.app

## Problem We Solve

Many Muslims want to go beyond surface-level reading and truly *live* the Quran, but they face three problems:

1. **Distraction & disconnection** — existing apps focus on recitation or translation, not on applying verses to daily life.
2. **AI mistrust** — generic AI tools hallucinate Islamic rulings, invent narrations, or quote scholars incorrectly.
3. **Fragmented experience** — reading, context, reflection, and personal notes are spread across multiple apps.

## How Wasl Helps People Engage with the Quran

- **Daily Reading** — Browse the complete Mushaf by page or navigate directly to any Surah/Ayah with elegant Arabic typography.
- **Understanding Tafsir** — Tap any Ayah to see verified background, meaning, and takeaways from Ibn Kathir, powered by the Quran Foundation MCP (Model Context Protocol) — no hallucination, no invented sources.
- **Reflection & Application** — "Live the Ayah" generates a concrete daily intention based on the verse, grounded in the verse's authentic tafsir context.
- **Personal Journey** — Save highlights, intentions, and reflections. Your data lives locally first, then syncs securely to your Quran Foundation account so it follows you across devices.
- **Community-Ready** — Push reminders and social features are wired in for future community learning features.

## Primary Audience

Muslims aged 18–45 who already read Quran regularly and want to deepen their connection — not just read, but *understand and apply*. Early users include students, working professionals, and parents looking for daily spiritual intentions.

---

## Technical Implementation

### Technologies Used

- **Frontend:** React 19 + TanStack Start v1 (full-stack SSR/SSG) + TanStack Router + TanStack Query
- **Styling:** Tailwind CSS v4 + shadcn/ui components + Framer Motion animations
- **Backend:** Lovable Cloud (serverless database + auth + edge functions)
- **AI:** Gemini 2.5 Pro via Lovable AI Gateway
- **MCP Integration:** Quran Foundation MCP Server (Streamable HTTP)
- **PWA:** Service Worker, Web Push notifications, installable on mobile/desktop
- **Build:** Vite 7, TypeScript (strict)

### Quran Foundation Content APIs Used

- `GET /api/v4/chapters/{id}` — Surah metadata and info
- `GET /api/v4/verses/by_key` — Fetch individual Ayah text and translations
- `GET /api/v4/verses/by_page` — Mushaf page rendering
- `GET /api/v4/recitations/{id}/by_ayah` — Audio recitation per Ayah
- `GET /api/v4/tafsirs/{id}/by_ayah` — Tafsir (Ibn Kathir) per Ayah
- `GET /api/v4/search` — Full-text search across Quran

### Quran Foundation User APIs Used

- **OAuth 2.0 Authorization** — Login via Quran Foundation identity
- **ID Token (`id_token`)** — Decoded on first login to extract the stable QF `sub` for cross-device account linking
- **`/oauth2/userinfo`** — Fetches user display name and profile info

### How We Use Quran Foundation APIs

1. **Content API (client_credentials)** — The app fetches verses, translations, tafsir, recitations, and search results directly from the Quran Foundation Content API. We use quran.com as a graceful public fallback for unauthenticated browsing.
2. **User API (OAuth2)** — When a user logs in with their Quran Foundation account, we perform a one-time background sync to link their local data with their QF identity. After that, the app uses a local-first, write-through pattern: changes appear instantly in the UI and are mirrored to QF in the background.
3. **Quran MCP (Model Context Protocol)** — Before any AI suggestion is generated, we call the Quran Foundation MCP server to pull the exact translation and tafsir for the selected Ayah. This material is injected into the Gemini prompt with a strict instruction: "You may ONLY use the provided Quran Foundation material as your source of truth." This guarantees that every "Live the Ayah" suggestion and every context panel is grounded in verified Quran Foundation tafsir, not in the model's training data.

---

## Local Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
```

The app requires the following environment variables (configured automatically by Lovable):

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Database & auth
- `QF_CLIENT_ID` / `QF_CLIENT_SECRET` — Quran Foundation OAuth
- `QF_CONTENT_API_URL` — Quran Foundation Content API base URL
- `LOVABLE_API_KEY` — Lovable AI Gateway access

---

*Wasl (وَصْل) — "Connection" in Arabic. Connecting hearts to the Quran, and the Quran to daily life.*
