import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/primary-button";
import { completeOnboarding } from "@/lib/profile.functions";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — Wasl" },
      { name: "description", content: "Begin your calm journey with the Quran." },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["welcome", "philosophy", "auth", "notifications", "style", "first-ayah"] as const;
type Step = (typeof STEPS)[number];

function Onboarding() {
  const [step, setStep] = useState<Step>("welcome");
  const [notificationPref, setNotificationPref] = useState<"allow" | "maybe_later">("maybe_later");
  const navigate = useNavigate();
  const complete = useServerFn(completeOnboarding);

  const next = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };

  const finish = async () => {
    await complete({ data: { notificationPref } });
    navigate({ to: "/home" });
  };

  return (
    <AppShell className="justify-between">
      <header className="pt-2 text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">Wasl</header>
      <motion.section
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        {step === "welcome" && (
          <>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">One ayah at a time.</h1>
            <p className="mt-6 max-w-sm text-balance text-base text-muted-foreground">
              Wasl helps you build a gentle, lasting relationship with the Quran — through reflection,
              remembrance, and gradual implementation.
            </p>
          </>
        )}
        {step === "philosophy" && (
          <>
            <h1 className="text-3xl font-medium tracking-tight md:text-4xl">No rush. No race.</h1>
            <p className="mt-6 max-w-sm text-balance text-base text-muted-foreground">
              You do not need to rush through the Quran. Sometimes one ayah can stay with you for days.
              Wasl honors that pace.
            </p>
          </>
        )}
        {step === "auth" && (
          <>
            <h1 className="text-3xl font-medium tracking-tight md:text-4xl">You're signed in.</h1>
            <p className="mt-6 max-w-sm text-balance text-base text-muted-foreground">
              Bookmarks, reflections, and your journey will sync across Quran.Foundation apps you use.
            </p>
          </>
        )}
        {step === "notifications" && (
          <>
            <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Gentle reminders?</h1>
            <p className="mt-6 max-w-sm text-balance text-base text-muted-foreground">
              When you choose to live an ayah, we can softly remind you. No guilt, no pressure.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={async () => {
                  if ("Notification" in window) await Notification.requestPermission();
                  setNotificationPref("allow");
                  next();
                }}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Allow Notifications
              </button>
              <button
                onClick={() => {
                  setNotificationPref("maybe_later");
                  next();
                }}
                className="rounded-2xl bg-secondary px-5 py-3 text-sm font-medium text-secondary-foreground"
              >
                Maybe Later
              </button>
            </div>
          </>
        )}
        {step === "style" && (
          <>
            <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Sequential Journey</h1>
            <p className="mt-6 max-w-sm text-balance text-base text-muted-foreground">
              Move through the Quran one ayah at a time, starting from Sūrah Al-Fātiḥah. You can revisit
              any ayah whenever your heart returns to it.
            </p>
          </>
        )}
        {step === "first-ayah" && (
          <>
            <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Your first ayah awaits.</h1>
            <p className="mt-6 max-w-sm text-balance text-base text-muted-foreground">
              Sūrah Al-Fātiḥah · 1:1. Take your time. There's no clock here.
            </p>
          </>
        )}
      </motion.section>

      <footer className="pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {step === "first-ayah" ? (
          <PrimaryButton onClick={finish}>Begin</PrimaryButton>
        ) : step === "notifications" ? null : (
          <PrimaryButton onClick={next}>Continue</PrimaryButton>
        )}
      </footer>
    </AppShell>
  );
}
