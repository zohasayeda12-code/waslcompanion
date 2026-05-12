# Wasl UI Revamp — "Calm but Alive" Visual System

Goal: keep Wasl's spiritual calm, but kill the dull/flat feel. Borrow the *craft* of premium game/companion apps (Duolingo, Finch, Headspace, Alto's Odyssey, Apple Fitness) — rich gradients, depth, glow, soft 3D, springy motion — without ever becoming loud, gamified, or dopamine-baity.

Mobile-first PWA. Every screen designed at 390×844 first, then scaled fluidly to tablet/desktop using a centered "device canvas" with ambient surroundings on larger screens.

We will build this in **8 sequential steps**. After each step you say *"move to next step"* and we proceed. Nothing else changes (no logic, no flow, no DB).

---

## Step 1 — New Color System & Theme Tokens
Replace the current cream/emerald palette with a richer, deeper, more cinematic one.

- New base: deep indigo-night canvas (`oklch(0.18 0.04 270)`) with warm aurora overlays
- Accent palette: emerald-gold-rose-violet aurora set (used sparingly, never all at once on one screen)
- New tokens added to `src/styles.css`:
  - `--gradient-aurora` (multi-stop hero gradient)
  - `--gradient-night-canvas` (background)
  - `--gradient-gold-glow`, `--gradient-emerald-deep`, `--gradient-rose-quiet`
  - `--shadow-glow-primary`, `--shadow-inner-soft`, `--shadow-floating`
  - `--surface-1`, `--surface-2`, `--surface-3` (layered glass surfaces)
  - `--blur-glass`, `--noise-overlay` (subtle film grain via SVG data-uri)
- Light mode kept but as a secondary; default becomes the rich dark mode (most premium game apps default dark)
- Type scale tightened, display font weight bumped for hero moments

Output: only `src/styles.css` touched. Visual tone changes everywhere immediately.

---

## Step 2 — App Shell & Responsive Device Canvas
Rebuild `AppShell` to feel like a **physical device floating in an ambient world**.

- Mobile (<640px): edge-to-edge full-bleed, safe-area aware, no max-width
- Tablet (640–1024): centered 420px "device" with soft outer glow + blurred aurora bg
- Desktop (>1024): same device, larger ambient scene around it (parallax-friendly), optional side rails for context (e.g. current ayah meta)
- Animated aurora background layer (very slow, low opacity, GPU-only `transform/opacity`)
- Subtle film-grain overlay for richness
- All spacing converted to `clamp()` for fluid scaling

Output: `src/components/app-shell.tsx` + a new `src/components/ambient-canvas.tsx`.

---

## Step 3 — Core Primitives (Buttons, Cards, Chips, Inputs)
Upgrade the building blocks once, propagate everywhere.

- `PrimaryButton`: gradient fill + inner highlight + soft outer glow + spring press (scale 0.97, 180ms)
- New `GlassCard` component: layered surface w/ backdrop-blur, 1px gradient border, inner light edge
- New `GlowChip` for status (Active Intention, Carried, Lived) — color-coded but muted
- Inputs/textarea: dark glass, inset shadow, focus = soft aurora ring
- Icon container component with gradient + glow (used for hero icons throughout)

Output: refreshed primitives in `src/components/`. shadcn components themed via tokens — no per-component overrides needed.

---

## Step 4 — Login, Splash & Onboarding
Apply new system to first-impression screens.

- Login: full-bleed aurora hero, animated breathing logo orb, glass CTA
- AuthSplash: richer breathing orb with concentric glow rings
- Onboarding 6 steps: each step gets its own subtle aurora tint (never garish), large display headlines, glass progress dots, spring page transitions

Output: `login.tsx`, `auth-splash.tsx`, `onboarding.tsx`.

---

## Step 5 — Home / Current Journey Screen
The screen users see most — must feel alive.

- Hero ayah card: deep glass with gold inner edge, Arabic in larger display weight, soft glow behind it
- Active Intention chip: floating glass pill with subtle pulse if `awaiting_response`
- "Live This Ayah" CTA: prominent gradient button with the existing ambient glow (now richer)
- Quick-action row (Reflect / Bookmark / Highlight / Next) as glass icon buttons
- Layered depth: background aurora → ayah card → CTA → floating chips

Output: `home.tsx`.

---

## Step 6 — Ayah Detail & Live Intention Screens
The deep-engagement surfaces.

- Ayah Detail: scrollable layered sheet feel, sticky glass header with source-aware back, toolbar as floating glass dock at bottom (mobile) or right rail (desktop)
- Highlight colors rendered as soft luminous swatches, not flat dots
- Journey panel (previous intentions) as stacked glass cards with timeline rail
- Live screen: AI suggestion arrives with a gentle shimmer-in; "Replace Current" dialog as premium glass modal

Output: `ayah.$surah.$ayah.tsx`, `live.$surah.$ayah.tsx`.

---

## Step 7 — Quran, Search, My Ayahs, Intentions
Bring secondary surfaces up to standard.

- Quran index: surah grid as glass tiles with number in display font, subtle hover/press
- Search: floating glass search bar, tabbed results (Quran / My Ayahs)
- My Ayahs: segmented glass tabs, rich list cards
- Intentions: timeline of past intentions with status chips

Output: those four route files.

---

## Step 8 — Motion, Micro-interactions & Final Polish
Tie it together with restrained motion.

- Standard easing tokens (`--ease-out-expo`, `--ease-spring`) baked into Tailwind utilities
- Page transitions via `motion/react` shared layout (250–350ms, no overshoot)
- Tap feedback on every interactive surface (scale + glow pulse, 1 frame)
- Reduced-motion respected throughout (`prefers-reduced-motion` disables aurora drift + page transitions)
- PWA polish: status-bar color matches new dark canvas, `theme-color` updated, manifest icons reviewed
- Final QA pass at 360 / 390 / 768 / 1024 / 1440 widths

Output: motion utilities, manifest/meta tweaks, responsive QA fixes.

---

## Guardrails kept across all steps
- No gamification, no streak counters, no badges, no confetti
- No flashing, no harsh gradients, no aggressive bounce
- Glow/aurora is always low-opacity and slow
- Reduced-motion always honored
- All colors via tokens — never hardcoded in components
- Mobile-first; every screen verified at 360px before scaling up
- Zero changes to data model, server functions, routes, or business logic

---

Reply **"move to step 1"** when ready and I'll start with the color system & tokens. After each step I'll pause for your go-ahead before moving on.