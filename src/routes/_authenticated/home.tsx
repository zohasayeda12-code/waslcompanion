import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
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
  const { data: nameData } = useQuery({ queryKey: ["display-name"], queryFn: () => nameFn(), staleTime: 5 * 60 * 1000 });

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
      : active?.status === "awaiting_response"
      ? "Living this ayah"
      : active
      ? "Current intention"
      : null;

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
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Assalāmu ʿalaykum
          </p>
          <h1 className="mt-1 text-[clamp(1.25rem,4.8vw,1.6rem)] font-medium tracking-tight text-foreground/90">
            A moment with the Qurʾān
          </h1>
        </div>
        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            aria-label="Sign out"
            className="glass interactive flex size-10 items-center justify-center rounded-full"
          >
            <LogOut className="size-4" />
          </button>
        </form>
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
          className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.06]"
          style={{
            background:
              "linear-gradient(165deg, oklch(0.22 0.035 270 / 0.85), oklch(0.17 0.03 280 / 0.9))",
          }}
        >
          {/* Atmospheric depth — very subtle */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-72 -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
            style={{ background: "var(--gradient-gold-glow)" }}
          />
          {/* Inner gold edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              boxShadow:
                "inset 0 1px 0 oklch(0.82 0.14 82 / 0.18), inset 0 -1px 0 oklch(0 0 0 / 0.35)",
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
              <p
                className="text-[clamp(1.6rem,7.5vw,2.15rem)] leading-[1.85] font-medium tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-display)", direction: "rtl" }}
              >
                {ayahData?.arabic || "···"}
              </p>
              {ayahData?.translation && (
                <p className="mt-6 text-[clamp(0.95rem,3.6vw,1.05rem)] leading-relaxed text-foreground/75">
                  {ayahData.translation}
                </p>
              )}
              <p className="mt-5 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {ayahData?.surahName ?? `Surah ${surah}`} · {surah}:{ayah}
              </p>
              {active && (
                <div className="mt-5 border-t border-white/[0.06] pt-4">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {active.text}
                  </p>
                  {active.reminder_at && (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      Reminder ·{" "}
                      {new Date(active.reminder_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
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
