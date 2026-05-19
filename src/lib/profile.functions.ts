import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";
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
  const extractFirstName = (data: Record<string, unknown>): string => {
    const pick = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : "");
    const full =
      pick("name") ||
      [pick("given_name"), pick("family_name")].filter(Boolean).join(" ") ||
      pick("preferred_username") ||
      pick("nickname") ||
      pick("first_name") ||
      pick("firstName") ||
      pick("username") ||
      pick("display_name") ||
      pick("displayName") ||
      "";
    let first = full.trim().split(/\s+/)[0] || "";
    if (!first) {
      const email = pick("email");
      if (email && email.includes("@")) first = email.split("@")[0];
    }
    return first;
  };

  try {
    const session = await getWaslSession();
    const token = session.data?.accessToken;
    if (!token) return { name: null as string | null };

    const res = await fetch(qfConfig.userInfoUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const bodyText = await res.text();
    console.log("[getDisplayName] userinfo", res.status, bodyText.slice(0, 500));
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(bodyText) as Record<string, unknown>; } catch {}

    // Try top-level, then common nested shapes
    let first = extractFirstName(data);
    if (!first) {
      for (const key of ["user", "profile", "data", "result"]) {
        const nested = data[key];
        if (nested && typeof nested === "object") {
          first = extractFirstName(nested as Record<string, unknown>);
          if (first) break;
        }
      }
    }

    // Fallback: decode the JWT access token claims
    if (!first) {
      try {
        const tok = session.data?.idToken ?? session.data?.accessToken;
        if (tok) {
          const parts = tok.split(".");
          if (parts.length >= 2) {
            const payload = JSON.parse(
              Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
            ) as Record<string, unknown>;
            console.log("[getDisplayName] jwt claims keys:", Object.keys(payload));
            first = extractFirstName(payload);
          }
        }
      } catch (e) {
        console.warn("[getDisplayName] jwt decode failed", e);
      }
    }

    console.log("[getDisplayName] resolved:", first);
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
