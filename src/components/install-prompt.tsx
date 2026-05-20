import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "wasl.install.dismissedAt";
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isPreviewOrIframe() {
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator.standalone === true
  );
}

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPreviewOrIframe()) return;
    if (isStandalone()) return;

    // Eagerly register the service worker so Chrome's installability heuristics
    // are met (manifest + SW with fetch handler over HTTPS).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const onCooldown = dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      if (!onCooldown) {
        // Soft delay so it doesn't appear during first paint
        setTimeout(() => setVisible(true), 4000);
      }
    };
    const installed = () => {
      setVisible(false);
      setEvt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
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

  return (
    <AnimatePresence>
      {visible && evt && (
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
          style={{ top: "calc(max(env(safe-area-inset-top), 1rem) + 3.5rem)" }}
        >
          <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-amber-300/20 text-amber-100">
              <Download className="h-4 w-4" />
            </div>
            <div className="flex-1 text-[13px] leading-tight text-white/90">
              <div className="font-medium">Install Wasl</div>
              <div className="text-white/60">For gentler reminders, right on your device.</div>
            </div>
            <button
              onClick={install}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-black transition hover:bg-white"
            >
              Install
            </button>
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
