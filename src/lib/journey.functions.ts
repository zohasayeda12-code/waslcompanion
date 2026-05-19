import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";

export const getJourneyState = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("journey_state")
    .select("current_surah, current_ayah, paused_journey, last_mushaf_page, reading_marker")
    .eq("user_id", userId)
    .maybeSingle();
  return (
    data ?? {
      current_surah: 1,
      current_ayah: 1,
      paused_journey: null,
      last_mushaf_page: 1,
      reading_marker: null as { surah: number; ayah: number; page: number } | null,
    }
  );
});

export const setReadingMarker = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        surah: z.number().int().min(1).max(114),
        ayah: z.number().int().min(1),
        page: z.number().int().min(1).max(604),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await supabaseAdmin
      .from("journey_state")
      .upsert({
        user_id: userId,
        reading_marker: { surah: data.surah, ayah: data.ayah, page: data.page },
      });
    return { ok: true };
  });

export const clearReadingMarker = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  await supabaseAdmin
    .from("journey_state")
    .update({ reading_marker: null })
    .eq("user_id", userId);
  return { ok: true };
});

/**
 * Advance to the next ayah. Always allowed (Non-Blocking Reading Rule).
 */
export const advanceJourney = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ surah: z.number().int(), ayah: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await supabaseAdmin
      .from("journey_state")
      .upsert({ user_id: userId, current_surah: data.surah, current_ayah: data.ayah });
    return { ok: true };
  });

export const resumePaused = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("journey_state")
    .select("paused_journey")
    .eq("user_id", userId)
    .maybeSingle();
  const paused = data?.paused_journey as { surah: number; ayah: number } | null;
  if (!paused) return { ok: false };
  await supabaseAdmin
    .from("journey_state")
    .update({ current_surah: paused.surah, current_ayah: paused.ayah, paused_journey: null })
    .eq("user_id", userId);
  return { ok: true, ...paused };
});

export const setLastMushafPage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ page: z.number().int().min(1).max(604) }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await supabaseAdmin
      .from("journey_state")
      .upsert({ user_id: userId, last_mushaf_page: data.page });
    return { ok: true };
  });
