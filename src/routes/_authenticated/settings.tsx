import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { usePureMode } from "@/hooks/use-pure-mode";
import { Switch } from "@/components/ui/switch";
import {
  getVapidPublicKey,
  saveSubscription,
} from "@/lib/push.functions";
import { logout, removePushSubscriptions } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Wasl" }] }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const [pure, setPure] = usePureMode();
  const navigate = useNavigate();

  const getKeyFn = useServerFn(getVapidPublicKey);
  const saveSubFn = useServerFn(saveSubscription);
  const removeSubsFn = useServerFn(removePushSubscriptions);
  const logoutFn = useServerFn(logout);

  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifNote, setNotifNote] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  // Reflect current browser state on mount
  useEffect(() => {
    (async () => {
      try {
        const mod = await import("@/lib/push-browser");
        if (!mod.pushSupported()) { setSupported(false); return; }
        if (Notification.permission !== "granted") { setNotifOn(false); return; }
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        setNotifOn(!!sub);
      } catch { /* noop */ }
    })();
  }, []);

  const toggleNotif = async (next: boolean) => {
    setNotifBusy(true);
    setNotifNote(null);
    try {
      const mod = await import("@/lib/push-browser");
      if (!mod.pushSupported()) {
        setSupported(false);
        return;
      }
      if (next) {
        const { publicKey } = await getKeyFn();
        if (!publicKey) { setNotifNote("Notifications unavailable right now."); return; }
        const sub = await mod.ensurePushSubscription(publicKey);
        if (!sub) {
          setNotifNote("Permission was not granted.");
          setNotifOn(false);
          return;
        }
        await saveSubFn({ data: { ...sub, userAgent: navigator.userAgent } });
        setNotifOn(true);
      } else {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) { try { await sub.unsubscribe(); } catch {} }
        await removeSubsFn();
        setNotifOn(false);
      }
    } catch (e) {
      console.warn("notif toggle", e);
      setNotifNote("Something went wrong. Try again in a moment.");
    } finally {
      setNotifBusy(false);
    }
  };

  const handleLogout = async () => {
    try { await logoutFn(); } catch {}
    navigate({ to: "/login" });
  };

  return (
    <AppShell>
      <header>
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quiet preferences for your time with the Qurʾān.
        </p>
      </header>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium">Pure Quran Mode</p>
            <p className="text-xs text-muted-foreground">
              Hide highlights, dots, and tools while reading.
            </p>
          </div>
          <Switch checked={pure} onCheckedChange={setPure} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div className="pr-4">
            <p className="text-sm font-medium">Daily reminders</p>
            <p className="text-xs text-muted-foreground">
              {supported
                ? "Gentle nudges to return to your ayah. Off by default."
                : "Notifications aren't supported on this device or browser."}
            </p>
            {notifNote && (
              <p className="mt-1 text-xs text-amber-400/80">{notifNote}</p>
            )}
          </div>
          <Switch
            checked={notifOn}
            disabled={!supported || notifBusy}
            onCheckedChange={toggleNotif}
          />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl border border-border bg-card p-4 text-left text-sm hover:bg-accent/30"
        >
          Sign out
        </button>
      </section>
    </AppShell>
  );
}
