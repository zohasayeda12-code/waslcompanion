import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";

import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { GlowChip } from "@/components/glow-chip";
import { HijriBanner } from "@/components/hijri-banner";
import { getJourneyState } from "@/lib/journey.functions";
import { getDisplayName } from "@/lib/profile.functions";
import { getAyah } from "@/lib/qf-content.functions";
import { getActiveIntention } from "@/lib/intentions.functions";
import { saveSubscription, getVapidPublicKey } from "@/lib/push.functions";


export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Wasl" }] }),
  component: HomeScreen,
});

function HomeScreen() {
  const journeyFn = useServerFn(getJourneyState);
  const intentionFn = useServerFn(getActiveIntention);
  const ayahFn = useServerFn(getAyah);
  const nameFn = useServerFn(getDisplayName);
  const navigate = useNavigate();

  const saveSubFn = useServerFn(saveSubscription);
  const getKeyFn = useServerFn(getVapidPublicKey);

  const { data: journey } = useQuery({ queryKey: ["journey"], queryFn: () => journeyFn() });
  const { data: active } = useQuery({ queryKey: ["active-intention"], queryFn: () => intentionFn() });
  const { data: nameData } = useQuery({ queryKey: ["display-name", "oidc"], queryFn: () => nameFn(), staleTime: 5 * 60 * 1000, retry: 2 });

  // Auto-register push so reminders arrive on this device
  useEffect(() => {
    (async () => {
      try {
        const mod = await import("@/lib/push-browser");
        if (!mod.pushSupported()) return;
        const { publicKey } = await getKeyFn();
        if (!publicKey) return;
        const sub = await mod.ensurePushSubscription(publicKey);
        if (sub) await saveSubFn({ data: { ...sub, userAgent: navigator.userAgent } });
      } catch (e) { console.warn("push setup", e); }
    })();
  }, [saveSubFn, getKeyFn]);

  // If there is an active intention, the Home card becomes that ayah.
  // Otherwise fall back to the sequential journey position.
  const surah = active?.surah ?? journey?.current_surah ?? 1;
  const ayah = active?.ayah ?? journey?.current_ayah ?? 1;

  const statusLabel =
    active?.status === "carried"
      ? "Carrying this ayah"
      : active
      ? "Living this ayah"
      : null;

  const reminderPhrase = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const h = d.getHours();
    let when = "";
    if (sameDay && h >= 18) when = "Reminder tonight";
    else if (sameDay && h < 12) when = "Reminder this morning";
    else if (sameDay) when = "Reminder later today";
    else if (isTomorrow && h < 12) when = "Reminder tomorrow morning";
    else if (isTomorrow && h >= 18) when = "Reminder tomorrow night";
    else if (isTomorrow) when = "Reminder tomorrow";
    else when = "Reminder";
    const time = d.toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    return `${when} · ${time}`;
  };


  const { data: ayahData } = useQuery({
    queryKey: ["ayah", surah, ayah],
    queryFn: () => ayahFn({ data: { surah, ayah } }),
    enabled: !!journey,
  });

  const goAyah = () =>
    navigate({
      to: "/ayah/$surah/$ayah",
      params: { surah: String(surah), ayah: String(ayah) },
      search: { from: "home" },
    });

  return (
    <AppShell>
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Assalāmu ʿalaykum{nameData?.name ? `, ${nameData.name}` : ""}
        </p>
        <h1 className="mt-1 text-[clamp(1.25rem,4.8vw,1.6rem)] font-medium tracking-tight text-foreground/90">
          A moment with the Qurʾān
        </h1>
      </header>

      {/* 1. Hijri month banner */}
      <div className="mt-5">
        <HijriBanner />
      </div>

      {/* 2. Current Ayah Card — primary focus */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5"
      >
        <article
          className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.08]"
          style={{
            background:
              "linear-gradient(165deg, oklch(0.22 0.035 270 / 0.85), oklch(0.17 0.03 280 / 0.9))",
            boxShadow:
              "0 0 0 1px oklch(0.82 0.14 82 / 0.08), 0 18px 60px -20px oklch(0.82 0.14 82 / 0.35), 0 8px 28px -12px oklch(0.42 0.06 168 / 0.45)",
          }}
        >
          {/* Outer soft aurora glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(60% 55% at 50% 40%, oklch(0.82 0.14 82 / 0.28), oklch(0.42 0.06 168 / 0.18) 55%, transparent 80%)",
            }}
          />
          {/* Atmospheric depth — very subtle */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl"
            style={{ background: "var(--gradient-gold-glow)" }}
          />
          {/* Inner gold edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              boxShadow:
                "inset 0 1px 0 oklch(0.82 0.14 82 / 0.22), inset 0 -1px 0 oklch(0 0 0 / 0.35)",
            }}
          />


          <button
            type="button"
            onClick={goAyah}
            className="interactive-card block w-full rounded-[2rem] text-left"
          >
            <div className="px-[clamp(1.25rem,5.5vw,1.75rem)] py-[clamp(1.75rem,7vw,2.25rem)]">
              {active && statusLabel && (
                <div className="mb-5 flex items-center gap-2">
                  <GlowChip tone="emerald" pulse>
                    {statusLabel}
                  </GlowChip>
                </div>
              )}
              <div className="relative overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={`${surah}:${ayah}`}
                    initial={{ y: 28, opacity: 0, filter: "blur(6px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: -28, opacity: 0, filter: "blur(6px)" }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p
                      dir="rtl"
                      lang="ar"
                      className="text-right text-[clamp(1.6rem,7.5vw,2.15rem)] leading-[1.85] font-medium tracking-tight text-foreground"
                      style={{ fontFamily: "var(--font-display)", direction: "rtl", unicodeBidi: "isolate" }}
                    >
                      {ayahData?.arabic || "···"}
                    </p>
                    {ayahData?.translation && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.18, ease: "easeOut" }}
                        className="mt-6 text-[clamp(0.95rem,3.6vw,1.05rem)] leading-relaxed text-foreground/75"
                      >
                        {ayahData.translation}
                      </motion.p>
                    )}
                    <p className="mt-5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      {ayahData?.surahName ?? `Surah ${surah}`} · {surah}:{ayah}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              {active && (
                <div className="mt-5 border-t border-white/[0.06] pt-4">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {active.text}
                  </p>
                  {active.reminder_at && (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      {reminderPhrase(active.reminder_at)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </button>
        </article>
      </motion.section>

    </AppShell>
  );
}
