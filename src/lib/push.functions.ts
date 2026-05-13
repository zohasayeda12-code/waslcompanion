import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireUserId } from "./current-user.server";
import { sendPushToUser } from "./push.server";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? "" };
});

export const saveSubscription = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      endpoint: z.string().url(),
      p256dh: z.string().min(1),
      auth: z.string().min(1),
      userAgent: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        { user_id: userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
        { onConflict: "endpoint" },
      );
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  const r = await sendPushToUser(userId, {
    title: "Wasl",
    body: "Notifications are working — your reminders will arrive here.",
    url: "/home",
    tag: "wasl-test",
  });
  return r;
});
