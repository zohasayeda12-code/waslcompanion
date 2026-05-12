import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";

export const getJourneyState = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("journey_state")
    .select("current_surah, current_ayah, paused_journey")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? { current_surah: 1, current_ayah: 1, paused_journey: null };
});

/**
 * Advance to the next ayah. Always allowed (Non-Blocking Reading Rule).
 * Naive sequential walk; sura length lookups can be added later.
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
