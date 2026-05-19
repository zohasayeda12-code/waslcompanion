import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { usePureMode } from "@/hooks/use-pure-mode";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getVapidPublicKey,
  saveSubscription,
} from "@/lib/push.functions";
import { removePushSubscriptions } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Wasl" }] }),
  component: SettingsScreen,
});

const RECITERS: { id: number; name: string }[] = [
  { id: 7, name: "Mishary Rashid Alafasy" },
  { id: 1, name: "AbdulBaset AbdulSamad (Mujawwad)" },
  { id: 2, name: "AbdulBaset AbdulSamad (Murattal)" },
  { id: 3, name: "Abdur-Rahman as-Sudais" },
  { id: 4, name: "Abu Bakr al-Shatri" },
  { id: 5, name: "Hani ar-Rifai" },
  { id: 6, name: "Mahmoud Khalil Al-Hussary" },
  { id: 9, name: "Mohamed Siddiq al-Minshawi" },
  { id: 10, name: "Sa'ud ash-Shuraym" },
];

const RECITER_KEY = "wasl.reciterId";
const DAILY_KEY = "wasl.dailyReminderAt";

function SettingsScreen() {
  const [pure, setPure] = usePureMode();

  const getKeyFn = useServerFn(getVapidPublicKey);
  const saveSubFn = useServerFn(saveSubscription);
  const removeSubsFn = useServerFn(removePushSubscriptions);

  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifNote, setNotifNote] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [dailyTime, setDailyTime] = useState<string>("08:00");

  const [reciterId, setReciterId] = useState<string>("7");

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
    try {
      const r = localStorage.getItem(RECITER_KEY);
      if (r) setReciterId(r);
      const t = localStorage.getItem(DAILY_KEY);
      if (t) setDailyTime(t);
    } catch {}
  }, []);

  const persistDaily = (v: string) => {
    setDailyTime(v);
    try { localStorage.setItem(DAILY_KEY, v); } catch {}
  };

  const onReciterChange = (v: string) => {
    setReciterId(v);
    try { localStorage.setItem(RECITER_KEY, v); } catch {}
  };

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
        try { localStorage.setItem(DAILY_KEY, dailyTime); } catch {}
      } else {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = await reg?.pushManager.getSubscription();
        if (sub) { try { await sub.unsubscribe(); } catch {} }
        await removeSubsFn();
        setNotifOn(false);
        try { localStorage.removeItem(DAILY_KEY); } catch {}
      }
    } catch (e) {
      console.warn("notif toggle", e);
      setNotifNote("Something went wrong. Try again in a moment.");
    } finally {
      setNotifBusy(false);
    }
  };

  return (
    <AppShell>
      <header>
        <h1 className="text-[1.55rem] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quiet preferences for your time with the Qurʾān.
        </p>
      </header>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium">Mushaf Mode</p>
            <p className="text-xs text-muted-foreground">
              Hide highlights, dots, and tools while reading.
            </p>
          </div>
          <Switch checked={pure} onCheckedChange={setPure} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <p className="text-sm font-medium">Daily reminders</p>
              <p className="text-xs text-muted-foreground">
                {supported
                  ? "One gentle nudge each day at your chosen time. Separate from your ayah intentions."
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
          {notifOn && (
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-border/60 pt-4">
              <div>
                <p className="text-xs font-medium text-foreground/80">Reminder time</p>
                <p className="text-[11px] text-muted-foreground">
                  Sent once each day at this time.
                </p>
              </div>
              <input
                type="time"
                value={dailyTime}
                onChange={(e) => persistDaily(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="pr-4">
              <p className="text-sm font-medium">Reciter</p>
              <p className="text-xs text-muted-foreground">
                Voice used for ayah audio on the ayah screen.
              </p>
            </div>
            <Select value={reciterId} onValueChange={onReciterChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select reciter" />
              </SelectTrigger>
              <SelectContent>
                {RECITERS.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
