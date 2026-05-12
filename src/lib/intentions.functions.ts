import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";

const ACTIVE_STATUSES = ["pending", "awaiting_response", "carried"] as const;

export const getActiveIntention = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("intentions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
});

export const listIntentionsForAyah = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ surah: z.number().int(), ayah: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: rows } = await supabaseAdmin
      .from("intentions")
      .select("*")
      .eq("user_id", userId)
      .eq("surah", data.surah)
      .eq("ayah", data.ayah)
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

export const listAllIntentions = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("intentions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
});

const CreateInput = z.object({
  surah: z.number().int(),
  ayah: z.number().int(),
  kind: z.enum(["ai", "custom"]),
  text: z.string().min(1).max(500),
  reminderAt: z.string().datetime().optional(),
  /** "replace" pauses any existing active intention; "skip" returns existing without creating. */
  onConflict: z.enum(["replace", "skip"]).optional(),
});

export const createIntention = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateInput.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    // Single-active-intention rule
    const { data: active } = await supabaseAdmin
      .from("intentions")
      .select("id, surah, ayah")
      .eq("user_id", userId)
      .in("status", ACTIVE_STATUSES as unknown as string[])
      .limit(1)
      .maybeSingle();

    if (active) {
      if (data.onConflict === "skip") {
        return { ok: false, reason: "active_exists", active };
      }
      if (data.onConflict !== "replace") {
        return { ok: false, reason: "active_exists", active };
      }
      // Pause the previous one and stash in journey_state.paused_journey
      await supabaseAdmin
        .from("intentions")
        .update({ status: "paused" })
        .eq("id", active.id);
      await supabaseAdmin
        .from("journey_state")
        .update({ paused_journey: { surah: active.surah, ayah: active.ayah, intentionId: active.id } })
        .eq("user_id", userId);
    }

    const { data: created, error } = await supabaseAdmin
      .from("intentions")
      .insert({
        user_id: userId,
        surah: data.surah,
        ayah: data.ayah,
        kind: data.kind,
        text: data.text,
        reminder_at: data.reminderAt ?? null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true, intention: created };
  });

export const markLived = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ intentionId: z.string().uuid(), reflection: z.string().max(2000).optional() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: intent } = await supabaseAdmin
      .from("intentions")
      .select("surah, ayah")
      .eq("id", data.intentionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!intent) throw new Response("Not found", { status: 404 });

    let reflectionId: string | null = null;
    if (data.reflection?.trim()) {
      const { data: r } = await supabaseAdmin
        .from("reflections_local")
        .insert({ user_id: userId, surah: intent.surah, ayah: intent.ayah, body: data.reflection.trim() })
        .select("id")
        .single();
      reflectionId = r?.id ?? null;
    }
    await supabaseAdmin
      .from("intentions")
      .update({ status: "lived", lived_at: new Date().toISOString(), reflection_id: reflectionId })
      .eq("id", data.intentionId)
      .eq("user_id", userId);
    return { ok: true };
  });

export const carryForward = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ intentionId: z.string().uuid(), reminderAt: z.string().datetime().optional() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: intent } = await supabaseAdmin
      .from("intentions")
      .select("carry_forward_count")
      .eq("id", data.intentionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!intent) throw new Response("Not found", { status: 404 });
    await supabaseAdmin
      .from("intentions")
      .update({
        status: "carried",
        carry_forward_count: (intent.carry_forward_count ?? 0) + 1,
        reminder_at: data.reminderAt ?? null,
      })
      .eq("id", data.intentionId)
      .eq("user_id", userId);
    return { ok: true };
  });

export const removeIntention = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ intentionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await supabaseAdmin
      .from("intentions")
      .update({ status: "removed" })
      .eq("id", data.intentionId)
      .eq("user_id", userId);
    return { ok: true };
  });

export const updateReminder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ intentionId: z.string().uuid(), reminderAt: z.string().datetime().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await supabaseAdmin
      .from("intentions")
      .update({ reminder_at: data.reminderAt })
      .eq("id", data.intentionId)
      .eq("user_id", userId)
      .in("status", ["pending", "carried"]);
    return { ok: true };
  });
