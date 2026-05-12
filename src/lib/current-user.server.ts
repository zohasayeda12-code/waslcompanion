import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getWaslSession } from "./qf-session.server";

/**
 * Resolves the signed-in user's stable internal user_id (profiles.id).
 * Lazily creates a profile row on first call, then caches the id in the session.
 *
 * Throws Response 401 if there's no QF access token.
 */
export async function requireUserId(): Promise<string> {
  const session = await getWaslSession();
  if (!session.data?.accessToken) {
    throw new Response("Unauthorized", { status: 401 });
  }
  if (session.data.userId) return session.data.userId;

  // First server call after login — create profile + journey_state.
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert({})
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
