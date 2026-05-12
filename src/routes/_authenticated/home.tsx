import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  BookOpen,
  Bookmark,
  Sparkles,
  ArrowRight,
  LogOut,
  Compass,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { GlowChip } from "@/components/glow-chip";
import { PrimaryLink } from "@/components/primary-button";
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
  const { data: journey } = useQuery({
    queryKey: ["journey"],
    queryFn: () => journeyFn(),
  });
  const { data: active } = useQuery({
    queryKey: ["active-intention"],
    queryFn: () => intentionFn(),
  });
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
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Assalāmu ʿalaykum
          </p>
          <h1 className="mt-1 text-[clamp(1.5rem,5.5vw,2rem)] font-medium tracking-tight">
            A moment with the <span className="text-aurora">Ayah</span>
          </h1>
        </div>
        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            aria-label="Sign out"
            className="glass flex size-11 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </header>

      {active && (
        <Link
          to="/ayah/$surah/$ayah"
          params={{ surah: String(active.surah), ayah: String(active.ayah) }}
          search={{ from: "home" }}
          className="mt-6 block"
        >
          <GlassCard tone="default" className="!p-4">
            <div className="flex items-start gap-3">
              <GlowChip tone="emerald" pulse>
                Carrying intention
              </GlowChip>
              <span className="ml-auto text-xs text-muted-foreground">
                {active.surah}:{active.ayah}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              {active.text}
            </p>
          </GlassCard>
        </Link>
      )}

      {/* Hero ayah card */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="mt-7"
      >
        <Link
          to="/ayah/$surah/$ayah"
          params={{ surah: String(surah), ayah: String(ayah) }}
          search={{ from: "home" }}
          className="group relative isolate block overflow-hidden rounded-[2rem]"
        >
          {/* Background gradient + glow */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{ background: "var(--gradient-emerald-deep)" }}
          />
          <div
            aria-hidden
            className="absolute -top-16 -right-10 -z-10 size-64 rounded-full opacity-50 blur-3xl"
            style={{ background: "var(--gradient-aurora)" }}
          />
          {/* Inner light edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              boxShadow:
                "inset 0 1px 0 oklch(1 0 0 / 0.12), inset 0 -1px 0 oklch(0 0 0 / 0.30)",
            }}
          />
          <div className="relative p-[clamp(1.5rem,6vw,2.25rem)]">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-white/70">
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full bg-[color:var(--gold)] shadow-[0_0_10px_oklch(0.82_0.14_82_/_0.8)]"
              />
              Your current ayah
            </div>
            <p
              className="mt-6 text-[clamp(1.5rem,7vw,2rem)] leading-relaxed font-medium tracking-tight text-white"
              style={{ fontFamily: "var(--font-display)", direction: "rtl" }}
            >
              {ayahData?.arabic || "···"}
            </p>
            {ayahData?.translation && (
              <p className="mt-5 text-[clamp(0.95rem,3.6vw,1.05rem)] leading-relaxed text-white/85">
                {ayahData.translation}
              </p>
            )}
            <div className="mt-6 flex items-center justify-between text-xs text-white/70">
              <span>
                {surah}:{ayah}
              </span>
              <span className="inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
                Open <ArrowRight className="size-3.5" />
              </span>
            </div>
          </div>
        </Link>

        {/* Live This Ayah CTA */}
        <div className="mt-5">
          <PrimaryLink
            to="/live/$surah/$ayah"
            params={{ surah: String(surah), ayah: String(ayah) }}
            variant="gold"
          >
            <Sparkles className="mr-2 size-4" />
            Live This Ayah
          </PrimaryLink>
        </div>
      </motion.section>

      {/* Quick navigation */}
      <nav className="mt-8 grid grid-cols-3 gap-2.5">
        <NavTile to="/quran" label="Quran" icon={<BookOpen className="size-5" />} />
        <NavTile
          to="/my-ayahs"
          label="My Ayahs"
          icon={<Bookmark className="size-5" />}
        />
        <NavTile
          to="/intentions"
          label="Journey"
          icon={<Compass className="size-5" />}
        />
      </nav>
    </AppShell>
  );
}

function NavTile({
  to,
  label,
  icon,
}: {
  to: "/quran" | "/my-ayahs" | "/intentions";
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="glass group flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center text-xs font-medium text-foreground/85 transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.97] hover:text-foreground"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-[color:var(--gold)] transition-colors group-hover:bg-white/10">
        {icon}
      </span>
      {label}
    </Link>
  );
}
