import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";

export const getProfile = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, onboarded_at, notification_pref")
    .eq("id", userId)
    .maybeSingle();
  return data;
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ notificationPref: z.enum(["allow", "maybe_later"]).optional() }).parse(d))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await supabaseAdmin
      .from("profiles")
      .update({
        onboarded_at: new Date().toISOString(),
        notification_pref: data.notificationPref ?? "maybe_later",
      })
      .eq("id", userId);
    return { ok: true };
  });
