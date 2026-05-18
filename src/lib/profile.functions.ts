import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";
import { qfUserFetch } from "./qf-user.server";

/**
 * Best-effort fetch of the signed-in user's display name from QF userinfo.
 * Returns null on any failure so the header degrades gracefully.
 */
export const getDisplayName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const res = await qfUserFetch("/auth/v1/userinfo");
    if (!res.ok) return { name: null as string | null };
    const data = (await res.json()) as Record<string, unknown>;
    const pick = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : "");
    const full =
      pick("name") ||
      [pick("given_name"), pick("family_name")].filter(Boolean).join(" ") ||
      pick("preferred_username") ||
      pick("nickname") ||
      pick("first_name") ||
      "";
    const first = full.trim().split(/\s+/)[0] || null;
    return { name: first };
  } catch {
    return { name: null as string | null };
  }
});

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
