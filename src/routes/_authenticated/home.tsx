import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AppShell } from "@/components/app-shell";
import { getJourneyState } from "@/lib/journey.functions";
import { getAyah } from "@/lib/qf-content.functions";
import { getActiveIntention } from "@/lib/intentions.functions";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "Home — Wasl" }] }),
  component: HomeScreen,
});

function HomeScreen() {
  const journeyFn = useServerFn(getJourneyState);
  const intentionFn = useServerFn(getActiveIntention);
  const { data: journey } = useQuery({ queryKey: ["journey"], queryFn: () => journeyFn() });
  const { data: active } = useQuery({ queryKey: ["active-intention"], queryFn: () => intentionFn() });
  const surah = journey?.current_surah ?? 1;
  const ayah = journey?.current_ayah ?? 1;
  const ayahFn = useServerFn(getAyah);
  const { data: ayahData } = useQuery({
    queryKey: ["ayah", surah, ayah],
    queryFn: () => ayahFn({ data: { surah, ayah } }),
    enabled: !!journey,
  });

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Assalāmu ʿalaykum</p>
          <h1 className="mt-1 text-2xl font-medium tracking-tight md:text-3xl">A moment with the Ayah</h1>
        </div>
        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            aria-label="Sign out"
            className="flex size-11 items-center justify-center rounded-full bg-secondary text-sm text-secondary-foreground hover:bg-accent"
          >
            ⏻
          </button>
        </form>
      </header>

      {active && (
        <Link
          to="/ayah/$surah/$ayah"
          params={{ surah: String(active.surah), ayah: String(active.ayah) }}
          search={{ from: "home" }}
          className="mt-6 block rounded-2xl border border-border bg-accent/30 p-4 text-sm"
        >
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Carrying intention</span>
          <p className="mt-1 font-medium">
            {active.surah}:{active.ayah} · {active.text}
          </p>
        </Link>
      )}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="mt-8 grid gap-3"
      >
        <div className="rounded-3xl border border-border bg-card p-5 opacity-60">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Daily reflection</p>
          <p className="mt-2 text-sm">Coming soon</p>
        </div>

        <Link
          to="/ayah/$surah/$ayah"
          params={{ surah: String(surah), ayah: String(ayah) }}
          search={{ from: "home" }}
          className="block rounded-3xl bg-[var(--gradient-primary)] p-7 text-primary-foreground shadow-[var(--shadow-elevated)] md:p-10"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-80">
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-[color:var(--gold)]" />
            Your current ayah
          </div>
          <p
            className="mt-5 text-2xl leading-relaxed font-medium tracking-tight md:text-3xl"
            style={{ fontFamily: "var(--font-display)", direction: "rtl" }}
          >
            {ayahData?.arabic || "···"}
          </p>
          {ayahData?.translation && (
            <p className="mt-4 text-base leading-relaxed opacity-90">{ayahData.translation}</p>
          )}
          <p className="mt-4 text-sm opacity-75">
            {surah}:{ayah}
          </p>
        </Link>

        <div className="rounded-3xl border border-border bg-card p-5 opacity-60">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Continue your journey</p>
          <p className="mt-2 text-sm">Coming soon</p>
        </div>
      </motion.section>

      <nav className="mt-8 grid grid-cols-3 gap-2 text-center text-sm">
        <Link to="/quran" className="rounded-2xl bg-secondary p-3">
          Quran
        </Link>
        <Link to="/my-ayahs" className="rounded-2xl bg-secondary p-3">
          My Ayahs
        </Link>
        <Link to="/intentions" className="rounded-2xl bg-secondary p-3">
          Intentions
        </Link>
      </nav>
    </AppShell>
  );
}
