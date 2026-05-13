// Browser-safe push subscription helper.
// The VAPID public key is fetched from the server at runtime so it always matches
// the VAPID_PRIVATE_KEY secret used to sign pushes (no hardcoded mismatch risk).
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function ensurePushSubscription(
  vapidPublicKey: string,
): Promise<{ endpoint: string; p256dh: string; auth: string } | null> {
  if (!pushSupported()) return null;
  if (!vapidPublicKey) return null;
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return null;

  let sub = await reg.pushManager.getSubscription();
  // If an existing subscription was created with a different VAPID key, drop it
  // so we resubscribe with the current one (otherwise pushes 403).
  if (sub) {
    const existingKey = sub.options.applicationServerKey;
    const want = urlBase64ToUint8Array(vapidPublicKey);
    const same =
      existingKey instanceof ArrayBuffer &&
      new Uint8Array(existingKey).length === want.length &&
      new Uint8Array(existingKey).every((b, i) => b === want[i]);
    if (!same) {
      try { await sub.unsubscribe(); } catch (_) {}
      sub = null;
    }
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}
