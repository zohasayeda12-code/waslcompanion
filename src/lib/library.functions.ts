import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";
import {
  bookmarksAdapter,
  collectionsAdapter,
  dispatchBackground,
  reflectionsAdapter,
} from "./sync.server";

const AyahKey = z.object({ surah: z.number().int(), ayah: z.number().int() });

export const toggleBookmark = createServerFn({ method: "POST" })
  .inputValidator((d) => AyahKey.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: existing } = await supabaseAdmin
      .from("bookmarks_local")
      .select("id, qf_bookmark_id")
      .eq("user_id", userId)
      .eq("surah", data.surah)
      .eq("ayah", data.ayah)
      .maybeSingle();

    if (existing) {
      // Optimistic local delete
      await supabaseAdmin.from("bookmarks_local").delete().eq("id", existing.id);
      // Background QF delete (only if we have a remote id)
      if (existing.qf_bookmark_id) {
        const qfId = existing.qf_bookmark_id;
        dispatchBackground(() => bookmarksAdapter.pushDelete(qfId), {
          userId,
          resource: "bookmark",
          operation: "delete",
          payload: { qfId, surah: data.surah, ayah: data.ayah },
        });
      }
      return { bookmarked: false };
    }

    // Optimistic local insert
    const { data: inserted } = await supabaseAdmin
      .from("bookmarks_local")
      .insert({ user_id: userId, surah: data.surah, ayah: data.ayah })
      .select("id")
      .single();

    // Background QF push: capture qf id back to local row
    const localId = inserted?.id;
    dispatchBackground(
      async () => {
        const result = await bookmarksAdapter.pushCreate(data.surah, data.ayah);
        if (result?.qfId && localId) {
          await supabaseAdmin
            .from("bookmarks_local")
            .update({ qf_bookmark_id: result.qfId })
            .eq("id", localId);
        }
      },
      { userId, resource: "bookmark", operation: "create", payload: data },
    );

    return { bookmarked: true };
  });

export const isBookmarked = createServerFn({ method: "GET" })
  .inputValidator((d) => AyahKey.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: row } = await supabaseAdmin
      .from("bookmarks_local")
      .select("id")
      .eq("user_id", userId)
      .eq("surah", data.surah)
      .eq("ayah", data.ayah)
      .maybeSingle();
    return { bookmarked: !!row };
  });

export const listBookmarks = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("bookmarks_local")
    .select("surah, ayah, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
});

// Reflections
export const listReflections = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ surah: z.number().int().optional(), ayah: z.number().int().optional() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    let q = supabaseAdmin
      .from("reflections_local")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data.surah) q = q.eq("surah", data.surah);
    if (data.ayah) q = q.eq("ayah", data.ayah);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const saveReflection = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ surah: z.number().int(), ayah: z.number().int(), body: z.string().min(1).max(2000), id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.id) {
      // Optimistic local update
      await supabaseAdmin
        .from("reflections_local")
        .update({ body: data.body })
        .eq("id", data.id)
        .eq("user_id", userId);
      const { data: row } = await supabaseAdmin
        .from("reflections_local")
        .select("qf_post_id")
        .eq("id", data.id)
        .maybeSingle();
      const qfId = row?.qf_post_id;
      if (qfId) {
        dispatchBackground(() => reflectionsAdapter.pushUpdate(qfId, data.body), {
          userId,
          resource: "reflection",
          operation: "update",
          payload: { id: data.id, qfId },
        });
      }
      return { ok: true, id: data.id };
    }
    const { data: r } = await supabaseAdmin
      .from("reflections_local")
      .insert({ user_id: userId, surah: data.surah, ayah: data.ayah, body: data.body })
      .select("id")
      .single();
    const localId = r?.id;
    dispatchBackground(
      async () => {
        const result = await reflectionsAdapter.pushCreate(data.surah, data.ayah, data.body);
        if (result?.qfId && localId) {
          await supabaseAdmin
            .from("reflections_local")
            .update({ qf_post_id: result.qfId })
            .eq("id", localId);
        }
      },
      { userId, resource: "reflection", operation: "create", payload: data },
    );
    return { ok: true, id: localId };
  });

export const deleteReflection = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: row } = await supabaseAdmin
      .from("reflections_local")
      .select("qf_post_id")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    await supabaseAdmin.from("reflections_local").delete().eq("id", data.id).eq("user_id", userId);
    const qfId = row?.qf_post_id;
    if (qfId) {
      dispatchBackground(() => reflectionsAdapter.pushDelete(qfId), {
        userId,
        resource: "reflection",
        operation: "delete",
        payload: { id: data.id, qfId },
      });
    }
    return { ok: true };
  });

// Collections
export const listCollections = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("collections_local")
    .select("id, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const createCollection = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: c } = await supabaseAdmin
      .from("collections_local")
      .insert({ user_id: userId, name: data.name })
      .select("id, name")
      .single();
    const localId = c?.id;
    dispatchBackground(
      async () => {
        const result = await collectionsAdapter.pushCreate(data.name);
        if (result?.qfId && localId) {
          await supabaseAdmin
            .from("collections_local")
            .update({ qf_collection_id: result.qfId })
            .eq("id", localId);
        }
      },
      { userId, resource: "collection", operation: "create", payload: data },
    );
    return c;
  });

export const addToCollection = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ collectionId: z.string().uuid(), surah: z.number().int(), ayah: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    // Verify collection ownership and grab QF id
    const { data: c } = await supabaseAdmin
      .from("collections_local")
      .select("id, qf_collection_id")
      .eq("id", data.collectionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!c) throw new Response("Forbidden", { status: 403 });
    const { data: item } = await supabaseAdmin
      .from("collection_items_local")
      .upsert({ collection_id: data.collectionId, surah: data.surah, ayah: data.ayah })
      .select("id")
      .single();
    const itemLocalId = item?.id;
    const qfCollectionId = c.qf_collection_id;
    if (qfCollectionId) {
      dispatchBackground(
        async () => {
          const result = await collectionsAdapter.pushAddItem(qfCollectionId, data.surah, data.ayah);
          if (result?.qfId && itemLocalId) {
            await supabaseAdmin
              .from("collection_items_local")
              .update({ qf_item_id: result.qfId })
              .eq("id", itemLocalId);
          }
        },
        { userId, resource: "collection_item", operation: "add", payload: data },
      );
    }
    return { ok: true };
  });

// Recently revisited
export const recordRevisit = createServerFn({ method: "POST" })
  .inputValidator((d) => AyahKey.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await supabaseAdmin
      .from("recently_revisited")
      .insert({ user_id: userId, surah: data.surah, ayah: data.ayah });
    return { ok: true };
  });

export const listRevisited = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("recently_revisited")
    .select("surah, ayah, visited_at")
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .limit(50);
  return data ?? [];
});
