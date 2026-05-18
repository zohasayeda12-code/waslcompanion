import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";
import { qfUserFetch } from "./qf-user.server";
import { getWaslSession } from "./qf-session.server";
import { qfConfig } from "./qf-config.server";

/** Clears the encrypted session cookie. Called from the client logout button. */
export const logout = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const session = await getWaslSession();
    await session.clear();
  } catch {
    // best-effort; cookie may already be gone
  }
  return { ok: true };
});

/** Removes all push subscriptions for the current user (notifications off). */
export const removePushSubscriptions = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  await supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId);
  return { ok: true };
});

/**
 * Best-effort fetch of the signed-in user's display name from QF userinfo.
 * Returns null on any failure so the header degrades gracefully.
 */
export const getDisplayName = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const session = await getWaslSession();
    const token = session.data?.accessToken;
    if (!token) return { name: null as string | null };

    // QF uses Ory Hydra — the OIDC userinfo endpoint lives on the OAuth host.
    const oauthOrigin = new URL(qfConfig.authUrl).origin;
    const tryUrls = [`${oauthOrigin}/userinfo`, `${oauthOrigin}/oauth2/userinfo`];

    let data: Record<string, unknown> = {};
    for (const url of tryUrls) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const bodyText = await res.text();
      console.log("[getDisplayName]", url, res.status, bodyText.slice(0, 300));
      if (res.ok) {
        try { data = JSON.parse(bodyText) as Record<string, unknown>; } catch {}
        break;
      }
    }

    const pick = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : "");
    const full =
      pick("name") ||
      [pick("given_name"), pick("family_name")].filter(Boolean).join(" ") ||
      pick("preferred_username") ||
      pick("nickname") ||
      pick("first_name") ||
      pick("username") ||
      pick("display_name") ||
      pick("displayName") ||
      "";
    let first = full.trim().split(/\s+/)[0] || "";
    if (!first) {
      const email = pick("email");
      if (email && email.includes("@")) first = email.split("@")[0];
    }
    console.log("[getDisplayName] resolved:", first, "keys:", Object.keys(data));
    return { name: first || null };
  } catch (e) {
    console.error("[getDisplayName] error", e);
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
