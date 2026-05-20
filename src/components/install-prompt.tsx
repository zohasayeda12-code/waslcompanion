import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Share } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "wasl.install.dismissedAt";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isInIframe() {
  if (typeof window === "undefined") return true;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function hasForceFlag() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("install");
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Iframes can never install — Chrome won't fire BIP there.
    if (isInIframe()) return;
    if (isStandalone()) return;

    const force = hasForceFlag();

    // Register the SW so Chrome's installability checks pass.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const onCooldown =
      !force && dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;

    // iOS Safari fallback — no BIP event, show manual hint.
    if (isIOS()) {
      if (!onCooldown) {
        const t = setTimeout(() => {
          setIosHint(true);
          setVisible(true);
        }, force ? 200 : 1500);
        return () => clearTimeout(t);
      }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      if (!onCooldown) {
        setTimeout(() => setVisible(true), force ? 200 : 1500);
      }
    };
    const installed = () => {
      setVisible(false);
      setEvt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);

    // Force-show even without BIP (for testing on hosts where Chrome refuses).
    let forceTimer: number | undefined;
    if (force) {
      forceTimer = window.setTimeout(() => setVisible(true), 300);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
      if (forceTimer) clearTimeout(forceTimer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!evt) return;
    try {
      await evt.prompt();
      await evt.userChoice;
    } catch {}
    setVisible(false);
    setEvt(null);
  };

  const show = visible && (evt || iosHint);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 z-[200] flex justify-center px-4"
          style={{ top: "max(env(safe-area-inset-top), 1rem)" }}
        >
          <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-amber-300/20 text-amber-100">
              {iosHint ? <Share className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            </div>
            <div className="flex-1 text-[13px] leading-tight text-white/90">
              <div className="font-medium">Install Wasl</div>
              <div className="text-white/60">
                {iosHint
                  ? "Tap Share, then “Add to Home Screen”."
                  : "For gentler reminders, right on your device."}
              </div>
            </div>
            {!iosHint && evt && (
              <button
                onClick={install}
                className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-black transition hover:bg-white"
              >
                Install
              </button>
            )}
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="rounded-full p-1 text-white/50 transition hover:text-white/90"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
