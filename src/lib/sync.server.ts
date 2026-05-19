/**
 * Sync layer between Wasl local DB and Quran.Foundation User APIs.
 *
 * Architecture:
 *   - All writes are LOCAL-FIRST (optimistic). UI updates immediately.
 *   - Background tasks push to QF; failures are logged to `sync_failures`
 *     but never block the user.
 *   - On first login, a one-time full pull imports the user's existing QF
 *     bookmarks, collections and reflections so "My Ayahs" is emotionally
 *     rich from the very first session.
 *   - The pull is idempotent and runs entirely in the background. The UI
 *     only surfaces a subtle "bringing your ayahs in" hint via getSyncStatus.
 *
 * Design intent: keep the QF wire format quarantined inside this file so
 * that the rest of the app stays decoupled from QF specifics. If QF
 * endpoints change tomorrow, only this file changes.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { qfUserFetch, QFAuthError } from "./qf-user.server";

// ─────────────────────────────────────────────────────────────────────────────
// Bookmark adapter
// ─────────────────────────────────────────────────────────────────────────────

export const bookmarksAdapter = {
  async pushCreate(surah: number, ayah: number): Promise<{ qfId: string } | null> {
    const res = await qfUserFetch(`/auth/v1/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ type: "ayah", key: surah, verseNumber: ayah, mushafId: 1 }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new QFAuthError(res.status, body.slice(0, 200));
    }
    const json = (await res.json()) as { data?: { id?: string } };
    return json.data?.id ? { qfId: json.data.id } : null;
  },

  async pushDelete(qfBookmarkId: string): Promise<void> {
    const res = await qfUserFetch(`/auth/v1/bookmarks/${encodeURIComponent(qfBookmarkId)}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => "");
      throw new QFAuthError(res.status, body.slice(0, 200));
    }
  },

  async pullAll(): Promise<Array<{ qfId: string; surah: number; ayah: number }>> {
    const items: Array<{ qfId: string; surah: number; ayah: number }> = [];
    let after: string | undefined;
    const PAGE = 20;
    const MAX_PAGES = 50;
    for (let i = 0; i < MAX_PAGES; i++) {
      const qs = new URLSearchParams({ first: String(PAGE), mushafId: "1" });
      if (after) qs.set("after", after);
      const res = await qfUserFetch(`/auth/v1/bookmarks?${qs.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new QFAuthError(res.status, "unauthorized");
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
// Collections adapter
// QF endpoints (per docs):
//   POST   /auth/v1/collections                      { name }
//   DELETE /auth/v1/collections/{id}
//   GET    /auth/v1/collections?first=&after=
//   POST   /auth/v1/collections/{id}/bookmarks       { type:"ayah", key, verseNumber, mushafId }
//   DELETE /auth/v1/collections/{id}/bookmarks/{itemId}
//   GET    /auth/v1/collections/{id}/bookmarks?first=&after=
// ─────────────────────────────────────────────────────────────────────────────

export const collectionsAdapter = {
  async pushCreate(name: string): Promise<{ qfId: string } | null> {
    const res = await qfUserFetch(`/auth/v1/collections`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new QFAuthError(res.status, body.slice(0, 200));
    }
    const json = (await res.json()) as { data?: { id?: string } };
    return json.data?.id ? { qfId: json.data.id } : null;
  },

  async pushDelete(qfCollectionId: string): Promise<void> {
    const res = await qfUserFetch(
      `/auth/v1/collections/${encodeURIComponent(qfCollectionId)}`,
      { method: "DELETE" },
    );
    if (!res.ok && res.status !== 404) {
      throw new QFAuthError(res.status, "delete failed");
    }
  },

  async pushAddItem(
    qfCollectionId: string,
    surah: number,
    ayah: number,
  ): Promise<{ qfId: string } | null> {
    const res = await qfUserFetch(
      `/auth/v1/collections/${encodeURIComponent(qfCollectionId)}/bookmarks`,
      {
        method: "POST",
        body: JSON.stringify({ type: "ayah", key: surah, verseNumber: ayah, mushafId: 1 }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new QFAuthError(res.status, body.slice(0, 200));
    }
    const json = (await res.json()) as { data?: { id?: string } };
    return json.data?.id ? { qfId: json.data.id } : null;
  },

  async pushRemoveItem(qfCollectionId: string, qfItemId: string): Promise<void> {
    const res = await qfUserFetch(
      `/auth/v1/collections/${encodeURIComponent(qfCollectionId)}/bookmarks/${encodeURIComponent(qfItemId)}`,
      { method: "DELETE" },
    );
    if (!res.ok && res.status !== 404) {
      throw new QFAuthError(res.status, "remove failed");
    }
  },

  async pullAll(): Promise<
    Array<{
      qfId: string;
      name: string;
      items: Array<{ qfId: string; surah: number; ayah: number }>;
    }>
  > {
    const out: Array<{
      qfId: string;
      name: string;
      items: Array<{ qfId: string; surah: number; ayah: number }>;
    }> = [];
    let after: string | undefined;
    const MAX_PAGES = 20;
    for (let i = 0; i < MAX_PAGES; i++) {
      const qs = new URLSearchParams({ first: "20" });
      if (after) qs.set("after", after);
      const res = await qfUserFetch(`/auth/v1/collections?${qs.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new QFAuthError(res.status, "unauthorized");
        break;
      }
      const json = (await res.json()) as {
        data?: Array<{ id: string; name: string }>;
        meta?: { endCursor?: string; hasNextPage?: boolean };
      };
      for (const c of json.data ?? []) {
        const items = await collectionsAdapter.pullItems(c.id);
        out.push({ qfId: c.id, name: c.name, items });
      }
      if (!json.meta?.hasNextPage || !json.meta?.endCursor) break;
      after = json.meta.endCursor;
    }
    return out;
  },

  async pullItems(qfCollectionId: string): Promise<Array<{ qfId: string; surah: number; ayah: number }>> {
    const items: Array<{ qfId: string; surah: number; ayah: number }> = [];
    let after: string | undefined;
    const MAX_PAGES = 50;
    for (let i = 0; i < MAX_PAGES; i++) {
      const qs = new URLSearchParams({ first: "50", mushafId: "1" });
      if (after) qs.set("after", after);
      const res = await qfUserFetch(
        `/auth/v1/collections/${encodeURIComponent(qfCollectionId)}/bookmarks?${qs.toString()}`,
      );
      if (!res.ok) break;
      const json = (await res.json()) as {
        data?: Array<{ id: string; type: string; key: number; verseNumber: number | null }>;
        meta?: { endCursor?: string; hasNextPage?: boolean };
      };
      for (const r of json.data ?? []) {
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
// Reflections adapter (QF "posts")
// QF endpoints:
//   POST   /auth/v1/posts            { type:"ayah", key, verseNumber, mushafId, body }
//   PATCH  /auth/v1/posts/{id}       { body }
//   DELETE /auth/v1/posts/{id}
//   GET    /auth/v1/posts?first=&after=
// ─────────────────────────────────────────────────────────────────────────────

export const reflectionsAdapter = {
  async pushCreate(
    surah: number,
    ayah: number,
    body: string,
  ): Promise<{ qfId: string } | null> {
    const res = await qfUserFetch(`/auth/v1/posts`, {
      method: "POST",
      body: JSON.stringify({
        type: "ayah",
        key: surah,
        verseNumber: ayah,
        mushafId: 1,
        body,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new QFAuthError(res.status, text.slice(0, 200));
    }
    const json = (await res.json()) as { data?: { id?: string } };
    return json.data?.id ? { qfId: json.data.id } : null;
  },

  async pushUpdate(qfPostId: string, body: string): Promise<void> {
    const res = await qfUserFetch(`/auth/v1/posts/${encodeURIComponent(qfPostId)}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    if (!res.ok && res.status !== 404) {
      throw new QFAuthError(res.status, "update failed");
    }
  },

  async pushDelete(qfPostId: string): Promise<void> {
    const res = await qfUserFetch(`/auth/v1/posts/${encodeURIComponent(qfPostId)}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      throw new QFAuthError(res.status, "delete failed");
    }
  },

  async pullAll(): Promise<
    Array<{ qfId: string; surah: number; ayah: number; body: string }>
  > {
    const items: Array<{ qfId: string; surah: number; ayah: number; body: string }> = [];
    let after: string | undefined;
    const MAX_PAGES = 50;
    for (let i = 0; i < MAX_PAGES; i++) {
      const qs = new URLSearchParams({ first: "20", mushafId: "1" });
      if (after) qs.set("after", after);
      const res = await qfUserFetch(`/auth/v1/posts?${qs.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new QFAuthError(res.status, "unauthorized");
        break;
      }
      const json = (await res.json()) as {
        data?: Array<{
          id: string;
          type: string;
          key: number;
          verseNumber: number | null;
          body: string;
        }>;
        meta?: { endCursor?: string; hasNextPage?: boolean };
      };
      for (const r of json.data ?? []) {
        if (r.type === "ayah" && r.verseNumber != null) {
          items.push({ qfId: r.id, surah: r.key, ayah: r.verseNumber, body: r.body ?? "" });
        }
      }
      if (!json.meta?.hasNextPage || !json.meta?.endCursor) break;
      after = json.meta.endCursor;
    }
    return items;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Background dispatch
// ─────────────────────────────────────────────────────────────────────────────

export function dispatchBackground(
  task: () => Promise<void>,
  ctx: { userId: string; resource: string; operation: string; payload?: unknown },
): void {
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

export async function kickoffInitialSyncIfNeeded(userId: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("qf_initial_synced_at, qf_initial_sync_started_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return;
  if (profile.qf_initial_synced_at) return;
  if (profile.qf_initial_sync_started_at) {
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

async function pullBookmarksInto(userId: string): Promise<number> {
  const remote = await bookmarksAdapter.pullAll();
  if (remote.length === 0) return 0;
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
  if (toInsert.length > 0) await supabaseAdmin.from("bookmarks_local").insert(toInsert);
  return toInsert.length;
}

async function pullReflectionsInto(userId: string): Promise<number> {
  const remote = await reflectionsAdapter.pullAll();
  if (remote.length === 0) return 0;
  const { data: existing } = await supabaseAdmin
    .from("reflections_local")
    .select("qf_post_id")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((r) => r.qf_post_id).filter(Boolean));
  const toInsert = remote
    .filter((r) => !have.has(r.qfId))
    .map((r) => ({
      user_id: userId,
      surah: r.surah,
      ayah: r.ayah,
      body: r.body,
      qf_post_id: r.qfId,
    }));
  if (toInsert.length > 0) await supabaseAdmin.from("reflections_local").insert(toInsert);
  return toInsert.length;
}

async function pullCollectionsInto(userId: string): Promise<number> {
  const remote = await collectionsAdapter.pullAll();
  if (remote.length === 0) return 0;
  const { data: existing } = await supabaseAdmin
    .from("collections_local")
    .select("id, qf_collection_id")
    .eq("user_id", userId);
  const haveByQf = new Map<string, string>();
  for (const c of existing ?? []) {
    if (c.qf_collection_id) haveByQf.set(c.qf_collection_id, c.id);
  }
  let inserted = 0;
  for (const c of remote) {
    let localId = haveByQf.get(c.qfId);
    if (!localId) {
      const { data: created } = await supabaseAdmin
        .from("collections_local")
        .insert({ user_id: userId, name: c.name, qf_collection_id: c.qfId })
        .select("id")
        .single();
      localId = created?.id;
      if (!localId) continue;
      inserted++;
    }
    if (c.items.length === 0) continue;
    const { data: existingItems } = await supabaseAdmin
      .from("collection_items_local")
      .select("qf_item_id")
      .eq("collection_id", localId);
    const haveItems = new Set((existingItems ?? []).map((r) => r.qf_item_id).filter(Boolean));
    const itemRows = c.items
      .filter((it) => !haveItems.has(it.qfId))
      .map((it) => ({
        collection_id: localId!,
        surah: it.surah,
        ayah: it.ayah,
        qf_item_id: it.qfId,
      }));
    if (itemRows.length > 0) {
      await supabaseAdmin.from("collection_items_local").insert(itemRows);
    }
  }
  return inserted;
}

async function runInitialSync(userId: string): Promise<void> {
  try {
    // Run the three pulls sequentially so any auth failure aborts cleanly.
    await pullBookmarksInto(userId);
    await pullCollectionsInto(userId);
    await pullReflectionsInto(userId);
    await supabaseAdmin
      .from("profiles")
      .update({ qf_initial_synced_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (e) {
    await supabaseAdmin
      .from("profiles")
      .update({ qf_initial_sync_started_at: null })
      .eq("id", userId);
    throw e;
  }
}

/** Force a full re-pull (settings → "Refresh from Quran.com"). */
export async function runManualRefresh(
  userId: string,
): Promise<{ bookmarks: number; collections: number; reflections: number }> {
  const bookmarks = await pullBookmarksInto(userId);
  const collections = await pullCollectionsInto(userId);
  const reflections = await pullReflectionsInto(userId);
  await supabaseAdmin
    .from("profiles")
    .update({ qf_initial_synced_at: new Date().toISOString() })
    .eq("id", userId);
  return { bookmarks, collections, reflections };
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
