import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "motion/react";
import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/primary-button";
import { GlassCard } from "@/components/glass-card";
import { completeOnboarding } from "@/lib/profile.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — Wasl" },
      { name: "description", content: "Begin your calm journey with the Quran." },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["welcome", "notifications", "first-ayah"] as const;
type Step = (typeof STEPS)[number];

function GlassButton({
  onClick,
  children,
  type = "button",
}: {
  onClick?: () => void | Promise<void>;
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="group relative isolate inline-flex h-16 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-8 py-4 text-base font-medium tracking-tight text-foreground/95 backdrop-blur-md transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-[1px] hover:border-white/15 hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.985]"
      style={{
        boxShadow:
          "inset 0 1px 0 oklch(1 0 0 / 0.07), 0 1px 0 oklch(0 0 0 / 0.4), 0 10px 30px -12px oklch(0 0 0 / 0.5)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, oklch(0.85 0.10 82 / 0.10), transparent 65%)",
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function Onboarding() {
  const [step, setStep] = useState<Step>("welcome");
  const [notificationPref, setNotificationPref] =
    useState<"allow" | "maybe_later">("maybe_later");
  const navigate = useNavigate();
  const complete = useServerFn(completeOnboarding);

  const idx = STEPS.indexOf(step);

  const next = () => {
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const finish = async (pref: "allow" | "maybe_later" = notificationPref) => {
    await complete({ data: { notificationPref: pref } });
    navigate({ to: "/home" });
  };

  const skip = () => finish("maybe_later");

  return (
    <AppShell framed={false} className="justify-between">
      <header className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[0.32em] text-muted-foreground/60 uppercase">
          Wasl
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i === idx
                    ? "w-6 bg-[color:var(--gold)] shadow-[0_0_12px_oklch(0.82_0.14_82_/_0.6)]"
                    : i < idx
                      ? "w-1.5 bg-white/40"
                      : "w-1.5 bg-white/10"
                )}
              />
            ))}
          </div>
          <button
            onClick={skip}
            className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/50 transition-colors hover:text-muted-foreground/80"
          >
            Skip
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-1 flex-col items-center justify-center text-center"
        >
          {step === "welcome" && (
            <>
              <h1 className="text-[clamp(2.25rem,9vw,3.25rem)] font-medium tracking-tight">
                One ayah <span className="text-aurora">at a time.</span>
              </h1>
              <p className="mt-6 max-w-sm text-balance text-base text-muted-foreground">
                Wasl is a companion that helps you build a deeper connection with the Quran.
              </p>
            </>
          )}
          {step === "notifications" && (
            <>
              <h1 className="text-[clamp(2rem,8vw,3rem)] font-medium tracking-tight">
                Gentle reminders?
              </h1>
              <p className="mt-6 max-w-sm text-balance text-base text-muted-foreground">
                When an ayah matters to you, Wasl can softly remind you
                throughout your day.
              </p>
              <p className="mt-3 max-w-sm text-balance text-sm text-muted-foreground/80">
                No guilt. No pressure.
              </p>
              <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
                <GlassButton
                  onClick={async () => {
                    if ("Notification" in window)
                      await Notification.requestPermission();
                    setNotificationPref("allow");
                    next();
                  }}
                >
                  Allow reminders
                </GlassButton>
                <GlassButton
                  onClick={() => {
                    setNotificationPref("maybe_later");
                    next();
                  }}
                >
                  Maybe later
                </GlassButton>
              </div>
            </>
          )}
          {step === "first-ayah" && (
            <>
              <h1 className="text-[clamp(2rem,8vw,3rem)] font-medium tracking-tight">
                Your first ayah <span className="text-aurora">awaits.</span>
              </h1>
              <GlassCard tone="strong" glow className="mt-8 w-full max-w-xs">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Sūrah Al-Fātiḥah · 1:1
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Take your time. There's no clock here.
                </p>
              </GlassCard>
            </>
          )}
        </motion.section>
      </AnimatePresence>

      <footer className="pt-4">
        <div className="md:mx-auto md:w-full md:max-w-xs">
          {step === "first-ayah" ? (
            <PrimaryButton variant="gold" onClick={() => finish()} className="!text-white">
              Begin
            </PrimaryButton>
          ) : step === "notifications" ? null : (
            <button
              type="button"
              onClick={next}
              className="group relative isolate inline-flex h-16 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-8 py-4 text-base font-medium tracking-tight text-foreground/95 backdrop-blur-md transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-[1px] hover:border-white/15 hover:bg-white/[0.06] active:translate-y-0 active:scale-[0.985]"
              style={{
                boxShadow:
                  "inset 0 1px 0 oklch(1 0 0 / 0.07), 0 1px 0 oklch(0 0 0 / 0.4), 0 10px 30px -12px oklch(0 0 0 / 0.5)",
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(120% 80% at 50% 0%, oklch(0.85 0.10 82 / 0.10), transparent 65%)",
                }}
              />
              <span className="relative z-10">Continue</span>
            </button>
          )}
        </div>
      </footer>
    </AppShell>
  );
}
