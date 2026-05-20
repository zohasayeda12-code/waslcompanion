import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getWaslSession } from "./qf-session.server";

/**
 * Resolves the signed-in user's stable internal user_id (profiles.id).
 *
 * Resolution order:
 *  1. Cached `session.userId` (fast path).
 *  2. Lookup by `qfSub` (the QF id_token `sub`) — same QF account on any
 *     device resolves to the same profile row, so progress is shared.
 *  3. Create a new profile (linked to `qfSub` when available) and seed
 *     journey_state at 1:1.
 *
 * Throws Response 401 if there's no QF access token.
 */
export async function requireUserId(): Promise<string> {
  const session = await getWaslSession();
  if (!session.data?.accessToken) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (session.data.userId) return session.data.userId;

  const qfSub = session.data.qfSub;

  // Try to find an existing profile for this QF account.
  if (qfSub) {
    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("qf_user_id", qfSub)
      .maybeSingle();
    if (lookupErr) {
      console.error("profile lookup failed", lookupErr);
      throw new Response("Profile lookup failed", { status: 500 });
    }
    if (existing?.id) {
      await session.update({ ...session.data, userId: existing.id });
      return existing.id;
    }
  }

  // First server call for this QF account — create profile + journey_state.
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert({ qf_user_id: qfSub ?? null })
    .select("id")
    .single();
  if (error || !data) {
    console.error("profile create failed", error);
    throw new Response("Profile init failed", { status: 500 });
  }
  // Seed journey at 1:1
  await supabaseAdmin.from("journey_state").insert({
    user_id: data.id,
    current_surah: 1,
    current_ayah: 1,
  });

  await session.update({ ...session.data, userId: data.id });
  return data.id;
}
