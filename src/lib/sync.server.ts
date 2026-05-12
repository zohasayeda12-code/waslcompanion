/**
 * Sync layer between Wasl local DB and Quran.Foundation User APIs.
 *
 * Architecture:
 *   - All writes are LOCAL-FIRST (optimistic). UI updates immediately.
 *   - Background tasks push to QF; failures are logged to `sync_failures`
 *     but never block the user.
 *   - On first login, a one-time full pull imports the user's existing QF
 *     bookmarks (then collections + reflections in later phases) so that
 *     "My Ayahs" is emotionally rich from the very first session.
 *   - The pull is idempotent and runs entirely in the background. The UI
 *     only surfaces a subtle "bringing your ayahs in" hint via getSyncStatus.
 *
 * Design intent: keep the QF wire format quarantined inside this file so
 * that the rest of the app (library.functions.ts, components, etc.) stays
 * decoupled from QF specifics. If QF endpoints change tomorrow, only this
 * file changes.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { qfUserFetch, QFAuthError } from "./qf-user.server";

// ─────────────────────────────────────────────────────────────────────────────
// Bookmark adapter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * QF "regular" bookmark add. Per docs:
 *   POST /auth/v1/bookmarks
 *   { type: "ayah", key: <surah>, verseNumber: <ayah>, mushafId: 1 }
 *
 * For Quran.com-style "saved/favourite ayah" semantics we use
 *   POST /v1/collections/__default__/bookmarks
 * — that drops the ayah into the user's default Favorites collection,
 * which is what the rest of the QF ecosystem renders as a bookmarked ayah.
 */
export const bookmarksAdapter = {
  async pushCreate(surah: number, ayah: number): Promise<{ qfId: string } | null> {
    try {
      const res = await qfUserFetch(`/auth/v1/bookmarks`, {
        method: "POST",
        body: JSON.stringify({
          type: "ayah",
          key: surah,
          verseNumber: ayah,
          mushafId: 1,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new QFAuthError(res.status, body.slice(0, 200));
      }
      const json = (await res.json()) as { data?: { id?: string } };
      return json.data?.id ? { qfId: json.data.id } : null;
    } catch (e) {
      throw e;
    }
  },

  async pushDelete(qfBookmarkId: string): Promise<void> {
    const res = await qfUserFetch(`/auth/v1/bookmarks/${encodeURIComponent(qfBookmarkId)}`, {
      method: "DELETE",
    });
    // 404 is fine — already gone.
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => "");
      throw new QFAuthError(res.status, body.slice(0, 200));
    }
  },

  async pullAll(): Promise<Array<{ qfId: string; surah: number; ayah: number }>> {
    // Cursor-paginated. Pull up to a reasonable cap to avoid runaway loops.
    const items: Array<{ qfId: string; surah: number; ayah: number }> = [];
    let after: string | undefined;
    const PAGE = 20;
    const MAX_PAGES = 50; // 1000 bookmarks max per first sync; manual refresh can re-run.
    for (let i = 0; i < MAX_PAGES; i++) {
      const qs = new URLSearchParams({ first: String(PAGE), mushafId: "1" });
      if (after) qs.set("after", after);
      const res = await qfUserFetch(`/auth/v1/bookmarks?${qs.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new QFAuthError(res.status, "unauthorized");
        // Other errors: stop the pull but keep what we got.
        break;
      }
      const json = (await res.json()) as {
        data?: Array<{ id: string; type: string; key: number; verseNumber: number | null }>;
        meta?: { endCursor?: string; hasNextPage?: boolean };
      };
      const rows = json.data ?? [];
      for (const r of rows) {
        if (r.type === "ayah" && r.verseNumber != null) {
          items.push({ qfId: r.id, surah: r.key, ayah: r.verseNumber });
        }
      }
      if (!json.meta?.hasNextPage || !json.meta?.endCursor) break;
      after = json.meta.endCursor;
    }
    return items;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Background dispatch helper — fire-and-forget with structured failure logging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedule a QF push task without awaiting it. Failures are logged to
 * `sync_failures` so they can be retried by a future job (or surfaced via
 * the manual refresh in Settings).
 */
export function dispatchBackground(
  task: () => Promise<void>,
  ctx: { userId: string; resource: string; operation: string; payload?: unknown },
): void {
  // Intentionally not awaited.
  void task().catch(async (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[sync] ${ctx.resource}.${ctx.operation} failed`, msg);
    try {
      await supabaseAdmin.from("sync_failures").insert({
        user_id: ctx.userId,
        resource: ctx.resource,
        operation: ctx.operation,
        payload: ctx.payload as any,
        error: msg,
      });
    } catch {
      /* best-effort */
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial full sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Idempotent: starts the initial sync if the user has never been synced
 * AND no sync is currently in flight. Returns immediately; the actual
 * pull runs in the background.
 *
 * The sync is guarded by `profiles.qf_initial_sync_started_at` to avoid
 * concurrent runs across tabs/devices.
 */
export async function kickoffInitialSyncIfNeeded(userId: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("qf_initial_synced_at, qf_initial_sync_started_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return;
  if (profile.qf_initial_synced_at) return; // already done
  if (profile.qf_initial_sync_started_at) {
    // If it's been over 5 minutes, assume the previous attempt died and retry.
    const started = new Date(profile.qf_initial_sync_started_at).getTime();
    if (Date.now() - started < 5 * 60 * 1000) return;
  }

  await supabaseAdmin
    .from("profiles")
    .update({ qf_initial_sync_started_at: new Date().toISOString() })
    .eq("id", userId);

  dispatchBackground(() => runInitialSync(userId), {
    userId,
    resource: "initial_sync",
    operation: "run",
  });
}

async function runInitialSync(userId: string): Promise<void> {
  // Phase 1A: bookmarks only. Collections + reflections will be added when
  // the user signs off on Phase 1B.
  try {
    const remote = await bookmarksAdapter.pullAll();
    if (remote.length > 0) {
      // Upsert: keep existing local rows, only add missing ones.
      const { data: existing } = await supabaseAdmin
        .from("bookmarks_local")
        .select("surah, ayah")
        .eq("user_id", userId);
      const have = new Set((existing ?? []).map((r) => `${r.surah}:${r.ayah}`));
      const toInsert = remote
        .filter((r) => !have.has(`${r.surah}:${r.ayah}`))
        .map((r) => ({
          user_id: userId,
          surah: r.surah,
          ayah: r.ayah,
          qf_bookmark_id: r.qfId,
        }));
      if (toInsert.length > 0) {
        await supabaseAdmin.from("bookmarks_local").insert(toInsert);
      }
    }
    await supabaseAdmin
      .from("profiles")
      .update({ qf_initial_synced_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (e) {
    // Mark as not-started so a future kickoff can retry.
    await supabaseAdmin
      .from("profiles")
      .update({ qf_initial_sync_started_at: null })
      .eq("id", userId);
    throw e;
  }
}

/** Force a full re-pull (settings → "Refresh from Quran.com"). */
export async function runManualRefresh(userId: string): Promise<{ pulled: number }> {
  const remote = await bookmarksAdapter.pullAll();
  const { data: existing } = await supabaseAdmin
    .from("bookmarks_local")
    .select("surah, ayah")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((r) => `${r.surah}:${r.ayah}`));
  const toInsert = remote
    .filter((r) => !have.has(`${r.surah}:${r.ayah}`))
    .map((r) => ({
      user_id: userId,
      surah: r.surah,
      ayah: r.ayah,
      qf_bookmark_id: r.qfId,
    }));
  if (toInsert.length > 0) {
    await supabaseAdmin.from("bookmarks_local").insert(toInsert);
  }
  await supabaseAdmin
    .from("profiles")
    .update({ qf_initial_synced_at: new Date().toISOString() })
    .eq("id", userId);
  return { pulled: toInsert.length };
}

export async function getSyncStatusFor(userId: string): Promise<{
  initialSynced: boolean;
  syncing: boolean;
}> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("qf_initial_synced_at, qf_initial_sync_started_at")
    .eq("id", userId)
    .maybeSingle();
  const initialSynced = !!profile?.qf_initial_synced_at;
  const startedRaw = profile?.qf_initial_sync_started_at;
  const syncing =
    !initialSynced &&
    !!startedRaw &&
    Date.now() - new Date(startedRaw).getTime() < 5 * 60 * 1000;
  return { initialSynced, syncing };
}
