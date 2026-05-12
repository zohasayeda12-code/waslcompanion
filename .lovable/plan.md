# Wasl — Living Ayah Journey (Final Plan)

## 1. Core model

**One active journey. One active intention. Reading is never blocked.**

- `current_journey_ayah` — sequential pointer (starts 1:1). Advanced only via Next Ayah on the current journey context.
- At most **one global active intention** at a time (`pending | awaiting_response | carried`).
- Reading, bookmarking, reflecting, highlighting, exploring other ayahs is always free and never alters the pointer.

Intention statuses: `pending`, `awaiting_response`, `lived` (locked, immutable text), `carried`, `paused`, `removed`.

**Single-active rule (gentle, non-blocking):**
- Next Ayah is **always enabled** (Non-Blocking Reading Rule). Carrying an intention forward never traps the user.
- Starting a NEW Live This Ayah while another active intention exists → soft dialog:
  - **Continue Current Intention** (close, do nothing) — for revisited ayahs the prior journey resumes naturally.
  - **Replace With This Ayah** → previous intention → `paused` (preserved in history); the previous journey ayah saved to `journey_state.paused_journey`; the new ayah becomes the active intention. After it resolves (Yes/Not yet→carry/remove), show a "Resume 2:157" CTA.

## 2. Data model (Lovable Cloud / Postgres, RLS scoped to `auth.uid()`)

- `profiles` (id, qf_user_id, onboarded_at, created_at)
- `journey_state` (user_id PK, current_surah, current_ayah, paused_journey jsonb, updated_at)
- `intentions` (id, user_id, surah, ayah, kind `ai|custom`, text, reminder_at, status, carry_forward_count, parent_id, lived_at, reflection_id, created_at, updated_at)
- `reflections_local` (id, user_id, surah, ayah, qf_post_id, body, created_at, updated_at)
- `bookmarks_local` (id, user_id, surah, ayah, qf_bookmark_id)
- `collections_local` (id, user_id, qf_collection_id, name)
- `collection_items_local` (collection_id, surah, ayah)
- `highlights` (user_id, surah, ayah, color `gold|blue|green|purple`, updated_at) — local-only
- `recently_revisited` (user_id, surah, ayah, visited_at) — last 50
- `push_subscriptions` (id, user_id, endpoint, p256dh, auth, created_at)
- `notification_log` (id, intention_id, sent_at, opened_at)

Enums: `intention_status`, `intention_kind`, `highlight_color`.

## 3. QF Content + User APIs (all three integrated now)

Server proxies (use `wasl_session` access token, refresh on 401):
- `qf-content.functions.ts` → `getAyah(surah,ayah)`, `getRange(surah,from,to)`, `searchQuran(q)` (translation/Arabic/transliteration/surah/ayah-ref).
- `qf-user.functions.ts` → Bookmarks, Collections, Reflections (Posts): list/create/update/delete with **write-through** to local mirrors. On QF failure: toast + retry-on-next-call.

Local mirrors exist purely so the UI is fast and resilient; QF is source of truth.

## 4. Reusable Ayah Detail Screen

One route, opened from everywhere:

```
src/routes/_authenticated/ayah.$surah.$ayah.tsx
  ?from=home|quran|bookmarks|highlights|reflections|collections|search|notification|revisited|my-ayahs
  &reflect=1   (optional — opens "How did your ayah land?" sheet)
```

Sections (all in one screen):
- Arabic, translation, transliteration, audio
- Contextual exploration (revelation background, themes, tafsir) via QF + MCP
- Bookmark, highlight color picker, "Add to collection?"
- Reflection editor (private, QF-synced, delete-with-confirmation)
- Journey panel: previous intentions list (lived/paused/removed are read-only history; active intention shows reminder + Yes/Not yet); "Live This Ayah" CTA
- "Live This Ayah Again" appends a new entry under previous intentions; triggers Replace dialog if another intention is active
- "Next Ayah" button (only meaningful when this ayah == current_journey_ayah; otherwise hidden — Next Ayah lives in the journey context)
- **Current Journey indicator chip** when this ayah ≠ current_journey_ayah: "Current Journey: 2:157" + "Return to Current Ayah"
- **Context-aware Back**: reads `from` query param and routes back to that source (Quran view restores scroll via sessionStorage by surah, others go to their list route)

Opening the Detail Screen NEVER changes `current_journey_ayah` or any intention.

### Live This Ayah — Ambient Attention Effect
After ~3s of inactivity on the screen, a soft slow-pulsing glow appears behind the Live button using two adjacent palette colors. Cancels instantly on any scroll/tap/navigate. Fires once per ayah session. Implemented as a CSS `@keyframes` opacity pulse on a blurred radial-gradient pseudo-element, gated by an idle timer.

## 5. Other routes

```
src/routes/
  _authenticated/
    home.tsx                          # current ayah hero, opens detail with from=home
    ayah.$surah.$ayah.tsx             # the reusable detail screen (above)
    live.$surah.$ayah.tsx             # AI vs Custom + reminder picker + Set Intention
    quran.tsx                         # surah list / overall reader entry
    quran.$surah.tsx                  # surah scroll with floating per-ayah toolbar
    my-ayahs.tsx                      # tabs: All | Bookmarks | Reflections | Lived | Highlights | Collections | Recently Revisited; with search
    search.tsx                        # global search (Quran + My Ayahs scopes)
    intentions.tsx                    # Settings → Your Intentions
    onboarding.tsx                    # 7-step flow (only shown when profiles.onboarded_at is null)
  api/public/push/send-due.ts         # cron endpoint (HMAC-signed)
```

Server fns (in `*.functions.ts` under `src/lib/`):
`journey`, `intentions`, `qf-content`, `qf-user`, `live-suggestion`, `push`, `highlights`, `revisited`, `search`.

## 6. Quran View (`/quran/$surah`)

Continuous scroll. Tap-on-mobile / hover-on-desktop reveals a small floating toolbar per ayah:
- **Reflection** → popover with translation + reflection editor
- **Journey** → popover showing intention history (read-only) + "Live This Ayah Again" (triggers Replace dialog if applicable)
- **Bookmark** → toggle + "Add to collection?" prompt
- **Highlight** → color picker (gold/blue/green/purple/Remove)
- **Expand** → opens Ayah Detail Screen (from=quran, scroll position remembered)

Floating chip always visible: **"Return to Current Ayah"**.
Toggle: **Pure Quran Mode** — adds a `data-pure="true"` attribute to a context provider; CSS hides highlight backgrounds, bookmark/reflection/journey markers. Nothing deleted.

## 7. Search

`/search` route + search input embedded in `/quran` and `/my-ayahs` headers. Tabs: **Quran** and **My Ayahs**.

- **Quran scope**: surah name, ayah ref (e.g. "2:255"), keyword in translation, Arabic, transliteration. Detects refs via regex and routes directly. Uses QF content `searchQuran`.
- **My Ayahs scope**: full-text over local mirrors — bookmarks, reflections (body), highlight color names, collection names, lived intentions, revisited list. Implemented via Postgres `to_tsvector` + `ilike` fallback.

Results are ayah cards with surah/ayah, translation preview, and emotional state markers (highlight color dot, bookmark icon, reflection chip, journey chip). Click → Ayah Detail with `from=search`.

## 8. AI suggestion (MCP-grounded)

`live-suggestion.functions.ts` — Lovable AI Gateway, `google/gemini-3-flash-preview`, AI SDK MCP client → `https://mcp.quran.ai/`. Tools loaded via `client.tools()`. System prompt grounds strictly in MCP tool outputs for the exact ayah; refuses gracefully and surfaces "Write your own" if no MCP material. Returns `{ suggestion, sources[] }`. MCP client closed in `finally`.

## 9. Web Push (VAPID)

- `web-push` pkg; secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.
- `public/sw.js` handles `push` (notification copy varies: "Your ayah is waiting to be lived." / "Carry this ayah with you today.") and `notificationclick` (opens `/ayah/$surah/$ayah?from=notification&reflect=1`).
- `push.functions.ts`: `getPublicKey`, `subscribe`, `unsubscribe`.
- pg_cron hits `/api/public/push/send-due` every minute; HMAC-verified; finds `pending && reminder_at <= now()`, sends, flips to `awaiting_response`, logs.

## 10. Onboarding (7 steps, gated by `profiles.onboarded_at`)

1. Welcome — "One ayah at a time." → Continue
2. Philosophy — no streaks/scores → Continue
3. QF OAuth sign-in (existing flow) — or "Continue later (limited local mode)" stub disabled in MVP (button present but routes to login)
4. Notification permission — Allow / Maybe Later (asks browser permission + subscribes if granted)
5. Reading style — Sequential Journey (locked default for MVP)
6. First Ayah Intro — lands on 1:1 with brief tooltips (Reflect / Bookmark / Highlight / Live This Ayah / Explore), dismissed permanently after view
7. Onboarding complete — sets `onboarded_at`, routes to `/home`

After completion, never shown again. Calm typography, no progress bar, no gamification.

## 11. Highlights

Local-only table. Fixed meanings (Gold/Blue/Green/Purple). Soft semi-transparent background on the ayah row. "Remove" option in the picker. Pure Quran Mode hides them via CSS. Filterable in My Ayahs.

## 12. Spirit guardrails (hard rules)

- No streaks, scores, percentages, completion bars surfaced anywhere.
- Stats wording (My Ayahs header): "29 ayahs lived this week" only.
- Intention text is **immutable** once `lived`. Reminder time editable while `pending|carried`.
- Reflection delete always shows confirmation.
- Pure Quran Mode is non-destructive.
- Next Ayah is never disabled (Non-Blocking Reading Rule).
- Live This Ayah ambient glow: subtle, slow, one-shot per session, cancels on any interaction.

## 13. Out of scope (this feature)

- Email reminder fallback
- Multi-translation / multi-reciter picker
- Offline write queue beyond simple retry
- Public/social reflection feeds
- Memorization tracker UI (color tag exists)
- Custom highlight meanings
- Non-sequential reading modes

## 14. Acceptance checks

1. Onboarding shows for new users only, sets `onboarded_at`.
2. Home shows current ayah; tapping middle card opens Ayah Detail with `from=home`.
3. Live → AI suggestion cites MCP or refuses; intention created; reminder scheduled; Next Ayah remains enabled.
4. Cron fires push; click opens correct ayah with reflect sheet.
5. Yes → optional reflection (QF-synced + mirrored) → intention `lived` + locked.
6. Not yet (past) → carry forward → reminder reschedules; user can still read forward.
7. ≥3 days carried → soft banner; ≥7 days → second banner.
8. New Live attempted while another active → Continue / Replace dialog. Replace → old `paused`, new active. After resolve → Resume CTA.
9. Live again on a past ayah while another active → same Replace dialog; old intention preserved as history under that ayah's Journey panel.
10. Bookmarks, Reflections, Collections all round-trip QF and survive reload via local mirrors.
11. Highlights persist; Pure Quran Mode hides them losslessly.
12. Quran View toolbar: all five actions work; Expand → Detail; "Return to Current Ayah" chip works; opening another ayah from Quran does NOT change `current_journey_ayah`.
13. Ayah Detail Back button honors `from=` for every entry source; Quran view restores scroll position.
14. Search finds by surah name, ayah ref, keyword, Arabic, transliteration; My Ayahs search finds by reflection text, highlight, collection, bookmarked.
15. Live button ambient glow appears after 3s idle, cancels on interaction, fires once per session.
16. All routes 401-safe; logged-out → `/login`. No `*.server.ts` leaks into client bundle.
