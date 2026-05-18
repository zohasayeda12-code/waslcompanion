## What's broken

The OAuth flow is working end-to-end. The crash happens *after* you're signed in, when the app loads `/home`:

1. `/home` lives under `_authenticated`, whose `beforeLoad` calls `getProfile()`.
2. `getProfile()` → `requireUserId()` → `supabaseAdmin` (server-side admin client).
3. `supabaseAdmin` reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `process.env`.
4. Neither is set in the Worker runtime, so it throws `Missing Supabase environment variable(s)…`.
5. Our SSR wrapper catches the throw and renders the "This page didn't load" branded page.

Confirmed in production logs (`lazz.lovable.app`, last hour) — same error also keeps the `/api/public/cron/reminders` job 500ing every minute.

The `.env` file has `SUPABASE_URL` and a publishable key, but the published Worker needs the *service role key* and the URL injected as real runtime secrets — that only happens when **Lovable Cloud** is enabled on the project.

## Fix (one step)

Enable Lovable Cloud on this project. That automatically provisions:

- `SUPABASE_URL` (server runtime)
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — the missing one
- The matching `VITE_SUPABASE_*` for the browser

No code changes are needed — `client.server.ts`, `requireUserId`, profile creation, journey state, bookmarks, reminders, and push all already read these names correctly. They just need the values to exist at runtime.

## After enabling

I'll verify:
1. Hit `/home` end-to-end via the server-invoke tool and confirm 200, not 500.
2. Confirm `/api/public/cron/reminders` returns 200 instead of 500.
3. Check that `profiles` and `journey_state` rows get created on first login.

## What I'm NOT changing

- No edits to OAuth code, redirect URIs, session cookie, or `client.server.ts` — those are all correct.
- No code restructuring. This is a config/provisioning issue, not a code bug.

## Heads-up

Once Cloud is enabled, the database schema this project expects (`profiles`, `journey_state`, `highlights`, `intentions`, `bookmarks_cache`, etc.) needs to exist. If the remix didn't bring tables over, the first authenticated request will then fail with a different error ("relation does not exist") — I'll detect that from logs and follow up with a migration if needed.
