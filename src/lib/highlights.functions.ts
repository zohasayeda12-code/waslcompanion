import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";

const HighlightInput = z.object({
  surah: z.number().int(),
  ayah: z.number().int(),
  color: z.enum(["gold", "blue", "green", "purple"]).nullable(),
});

export const setHighlight = createServerFn({ method: "POST" })
  .inputValidator((d) => HighlightInput.parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.color === null) {
      await supabaseAdmin
        .from("highlights")
        .delete()
        .eq("user_id", userId)
        .eq("surah", data.surah)
        .eq("ayah", data.ayah);
      return { ok: true, color: null };
    }
    await supabaseAdmin.from("highlights").upsert({
      user_id: userId,
      surah: data.surah,
      ayah: data.ayah,
      color: data.color,
    });
    return { ok: true, color: data.color };
  });

export const getHighlight = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ surah: z.number().int(), ayah: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { data: row } = await supabaseAdmin
      .from("highlights")
      .select("color")
      .eq("user_id", userId)
      .eq("surah", data.surah)
      .eq("ayah", data.ayah)
      .maybeSingle();
    return row;
  });

export const listHighlights = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ color: z.enum(["gold", "blue", "green", "purple"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    let q = supabaseAdmin
      .from("highlights")
      .select("surah, ayah, color, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (data.color) q = q.eq("color", data.color);
    const { data: rows } = await q;
    return rows ?? [];
  });
