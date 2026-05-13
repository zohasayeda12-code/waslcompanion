import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { BookOpen, Bookmark, Sparkles, Heart, ChevronDown, Loader2, Check, Play, Pause, X, Lock } from "lucide-react";
import { getAyah } from "@/lib/qf-content.functions";
import { getAyahContext } from "@/lib/ayah-context.functions";
import { listIntentionsForAyah, getActiveIntention, markLived, carryForward, removeIntention, createIntention } from "@/lib/intentions.functions";
import { generateLiveSuggestion } from "@/lib/live-suggestion.functions";
import { getJourneyState, advanceJourney } from "@/lib/journey.functions";
import { toggleBookmark, isBookmarked, recordRevisit } from "@/lib/library.functions";
import { setHighlight, getHighlight } from "@/lib/highlights.functions";
import { saveReflection } from "@/lib/library.functions";

const search = z.object({
  from: z.enum(["home", "quran", "bookmarks", "highlights", "reflections", "collections", "search", "notification", "revisited", "my-ayahs"]).optional(),
  reflect: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/_authenticated/ayah/$surah/$ayah")({
  validateSearch: search,
  head: ({ params }) => ({ meta: [{ title: `${params.surah}:${params.ayah} — Wasl` }] }),
  component: AyahDetail,
});

type SheetKind = "tafsir" | "context" | "live" | null;

function AyahDetail() {
  const { surah, ayah } = Route.useParams();
  const { from } = Route.useSearch();
  const s = Number(surah);
  const a = Number(ayah);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const ayahFn = useServerFn(getAyah);
  const intentionsFn = useServerFn(listIntentionsForAyah);
  const activeFn = useServerFn(getActiveIntention);
  const journeyFn = useServerFn(getJourneyState);
  const advanceFn = useServerFn(advanceJourney);
  const bookmarkedFn = useServerFn(isBookmarked);
  const toggleBookmarkFn = useServerFn(toggleBookmark);
  const getHighlightFn = useServerFn(getHighlight);
  // markLived is invoked inside <LivedFlow/>; carryForward inside <CarryForwardSheet/>
  const removeFn = useServerFn(removeIntention);
  const revisitFn = useServerFn(recordRevisit);
  const contextFn = useServerFn(getAyahContext);

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [glowLive, setGlowLive] = useState(false);
  const [confirmation, setConfirmation] = useState<{ when: string } | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Lived flow: 'celebrate' (warm rotating message) → 'reflect' (optional reflection) → done
  const [livedFlow, setLivedFlow] = useState<null | { intentionId: string; phase: "celebrate" | "reflect" }>(null);
  // Carry-forward picker
  const [carryFlow, setCarryFlow] = useState<null | { intentionId: string }>(null);
  // Tooltip when Next Ayah is blocked
  const [showBlocked, setShowBlocked] = useState(false);
  // Soft reflection prompt before advancing to next ayah
  const [advanceFlow, setAdvanceFlow] = useState(false);

  // 3-second delayed glow on Live icon
  useEffect(() => {
    const t = setTimeout(() => setGlowLive(true), 3000);
    return () => clearTimeout(t);
  }, [s, a]);

  const { data: ayahData } = useQuery({ queryKey: ["ayah", s, a, "full"], queryFn: () => ayahFn({ data: { surah: s, ayah: a, includeTafsir: true } }) });
  const { data: intentions = [] } = useQuery({ queryKey: ["intentions", s, a], queryFn: () => intentionsFn({ data: { surah: s, ayah: a } }) });
  const { data: active } = useQuery({ queryKey: ["active-intention"], queryFn: () => activeFn() });
  const { data: journey } = useQuery({ queryKey: ["journey"], queryFn: () => journeyFn() });
  const { data: bookmark } = useQuery({ queryKey: ["bookmark", s, a], queryFn: () => bookmarkedFn({ data: { surah: s, ayah: a } }) });
  useQuery({ queryKey: ["highlight", s, a], queryFn: () => getHighlightFn({ data: { surah: s, ayah: a } }) });
  const { data: contextData, isLoading: contextLoading } = useQuery({
    queryKey: ["ayah-context", s, a],
    queryFn: () => contextFn({ data: { surah: s, ayah: a } }),
    enabled: sheet === "context",
    staleTime: 24 * 60 * 60 * 1000,
  });

  const isCurrent = journey?.current_surah === s && journey?.current_ayah === a;

  useEffect(() => {
    if (from && from !== "home") {
      revisitFn({ data: { surah: s, ayah: a } }).catch(() => {});
    }
  }, [s, a, from, revisitFn]);

  const back = () => {
    const map: Record<string, string> = {
      quran: `/quran/${s}`,
      bookmarks: "/my-ayahs",
      highlights: "/my-ayahs",
      reflections: "/my-ayahs",
      collections: "/my-ayahs",
      search: "/search",
      "my-ayahs": "/my-ayahs",
      revisited: "/my-ayahs",
      notification: "/home",
      home: "/home",
    };
    navigate({ to: map[from ?? "home"] ?? "/home" });
  };

  // Active intention for THIS ayah (shown below the card)
  const activeForThis = useMemo(
    () => intentions.find((i) => i.status === "pending" || i.status === "awaiting_response" || i.status === "carried"),
    [intentions]
  );

  // Next Ayah gating: blocked while there is an active intention on THIS ayah
  // and it has been carried forward fewer than 2 times. Once the user has
  // chosen "Carry forward" twice, the next-ayah button unlocks.
  const nextAyahLocked = Boolean(activeForThis && (activeForThis.carry_forward_count ?? 0) < 2);

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <button onClick={back} className="interactive rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{s}:{a}</span>
      </header>

      {!isCurrent && journey && (
        <Link
          to="/ayah/$surah/$ayah"
          params={{ surah: String(journey.current_surah), ayah: String(journey.current_ayah) }}
          search={{ from: "home" }}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/40 px-3 py-1 text-xs text-accent-foreground"
        >
          Current Journey: {journey.current_surah}:{journey.current_ayah} · Return →
        </Link>
      )}

      {/* Ayah card */}
      <section className="mt-6 rounded-3xl border border-border/60 bg-card/60 p-6 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--gold)]">
            {s}:{a}
          </p>
          <button
            onClick={() => setSheet("live")}
            aria-label="Live this ayah"
            className="interactive relative inline-flex size-8 items-center justify-center rounded-full border border-border/60 bg-secondary/40 text-[color:var(--rose,oklch(0.72_0.16_15))]"
          >
            {glowLive && !activeForThis && (
              <span
                className="absolute inset-0 -z-10 animate-ping rounded-full"
                style={{ background: "color-mix(in oklab, var(--rose, oklch(0.72 0.16 15)) 50%, transparent)" }}
              />
            )}
            <Heart className="size-4" />
          </button>
        </div>

        <p
          className="mt-6 text-center text-3xl leading-loose font-medium md:text-4xl"
          style={{ fontFamily: "var(--font-display)", direction: "rtl" }}
        >
          {ayahData?.arabic || "···"}
        </p>

        <div className="mt-6 h-px w-full bg-border/60" />

        {ayahData?.translation ? (
          <p className="mt-5 text-base italic leading-relaxed text-foreground/90">
            “{ayahData.translation}”
          </p>
        ) : ayahData ? (
          <p className="mt-5 text-sm italic text-muted-foreground">Translation unavailable.</p>
        ) : null}

        {ayahData?.transliteration && (
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--emerald)]/90">
            {ayahData.transliteration}
          </p>
        )}

        {/* 4 icons — one row */}
        <div className="mt-6 grid grid-cols-4 gap-1.5">
          <IconPill
            label="Tafsir"
            icon={<BookOpen className="size-3.5" />}
            color="var(--gold)"
            onClick={() => setSheet("tafsir")}
          />
          <IconPill
            label={audioPlaying ? "Pause" : "Audio"}
            icon={audioPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            color="var(--violet)"
            active={audioPlaying}
            onClick={() => {
              const el = audioRef.current;
              if (!el || !ayahData?.audioUrl) return;
              if (el.paused) { el.play(); } else { el.pause(); }
            }}
          />
          <IconPill
            label={bookmark?.bookmarked ? "Saved" : "Save"}
            icon={<Bookmark className="size-3.5" />}
            color="var(--emerald)"
            active={bookmark?.bookmarked}
            onClick={async () => {
              await toggleBookmarkFn({ data: { surah: s, ayah: a } });
              qc.invalidateQueries({ queryKey: ["bookmark", s, a] });
            }}
          />
          <IconPill
            label="Context"
            icon={<Sparkles className="size-3.5" />}
            color="var(--violet)"
            onClick={() => setSheet("context")}
          />
        </div>
        {ayahData?.audioUrl && (
          <audio
            ref={audioRef}
            src={ayahData.audioUrl}
            preload="none"
            onPlay={() => setAudioPlaying(true)}
            onPause={() => setAudioPlaying(false)}
            onEnded={() => setAudioPlaying(false)}
            className="hidden"
          />
        )}
      </section>

      {/* Active intention summary */}
      {activeForThis && (
        <section className="mt-4 rounded-3xl border border-[color:var(--rose,oklch(0.72_0.16_15))]/30 bg-[oklch(0.72_0.16_15_/_0.06)] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--rose,oklch(0.72_0.16_15))]">Your intention · {activeForThis.kind === "ai" ? "Suggested" : "Custom"}</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{activeForThis.text}</p>
          {activeForThis.reminder_at && (
            <p className="mt-2 text-xs text-muted-foreground">
              Reminder: {new Date(activeForThis.reminder_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setLivedFlow({ intentionId: activeForThis.id, phase: "celebrate" })}
              className="interactive rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground"
            >
              Yes, I tried
            </button>
            <button
              onClick={() => setCarryFlow({ intentionId: activeForThis.id })}
              className="interactive rounded-full bg-accent/60 px-3 py-1 text-xs"
            >
              Carry this ayah forward
            </button>
            <button
              onClick={async () => { await removeFn({ data: { intentionId: activeForThis.id } }); qc.invalidateQueries(); }}
              className="interactive rounded-full bg-secondary px-3 py-1 text-xs"
            >
              Remove intention
            </button>
          </div>
        </section>
      )}

      {/* Bottom sheets */}
      {sheet === "tafsir" && (
        <BottomSheet title={`Tafsir · ${ayahData?.tafsir?.name ?? "Ibn Kathir"}`} onClose={() => setSheet(null)}>
          {ayahData?.tafsir?.text ? (
            <div
              className="text-sm leading-relaxed text-foreground/85 [&_p]:mt-2"
              dangerouslySetInnerHTML={{ __html: ayahData.tafsir.text }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Tafsir unavailable for this ayah.</p>
          )}
        </BottomSheet>
      )}

      {sheet === "context" && (
        <BottomSheet title="Context · Asbāb al-Nuzūl" onClose={() => setSheet(null)}>
          {contextLoading ? (
            <p className="text-sm text-muted-foreground">Generating context from Quran MCP…</p>
          ) : contextData?.context ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{contextData.context}</div>
          ) : (
            <p className="text-sm text-muted-foreground">No context available.</p>
          )}
        </BottomSheet>
      )}

      {sheet === "live" && (
        <LiveSheet
          surah={s}
          ayah={a}
          existingActive={active && (active.surah !== s || active.ayah !== a) ? active : null}
          onClose={() => setSheet(null)}
          onSet={(when) => {
            setSheet(null);
            setConfirmation({ when });
            qc.invalidateQueries({ queryKey: ["intentions", s, a] });
            qc.invalidateQueries({ queryKey: ["active-intention"] });
          }}
        />
      )}

      {confirmation && (
        <ConfirmDialog
          when={confirmation.when}
          onClose={() => setConfirmation(null)}
        />
      )}

      {isCurrent && (
        <div className="mt-6">
          <button
            onClick={async () => {
              if (nextAyahLocked) { setShowBlocked(true); return; }
              setAdvanceFlow(true);
            }}
            aria-disabled={nextAyahLocked}
            className={`interactive flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium ${
              nextAyahLocked ? "bg-secondary/50 text-muted-foreground" : "bg-secondary"
            }`}
          >
            {nextAyahLocked && <Lock className="size-3.5" />}
            {nextAyahLocked ? "Sit with this ayah" : "Next Ayah →"}
          </button>
          {showBlocked && nextAyahLocked && (
            <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
              You are carrying this ayah. Live it, carry it forward, or remove the intention to move on.
            </p>
          )}
        </div>
      )}

      {advanceFlow && (
        <ReflectBeforeNextSheet
          surah={s}
          ayah={a}
          onClose={() => setAdvanceFlow(false)}
          onContinue={async () => {
            setAdvanceFlow(false);
            await advanceFn({ data: { surah: s, ayah: a + 1 } });
            navigate({ to: "/ayah/$surah/$ayah", params: { surah, ayah: String(a + 1) }, search: { from: "home" } });
          }}
        />
      )}

      {livedFlow && (
        <LivedFlow
          phase={livedFlow.phase}
          intentionId={livedFlow.intentionId}
          onAdvancePhase={() => setLivedFlow((f) => (f ? { ...f, phase: "reflect" } : f))}
          onCloseStay={() => { setLivedFlow(null); qc.invalidateQueries(); }}
          onDoneAdvance={async () => {
            setLivedFlow(null);
            qc.invalidateQueries();
            if (isCurrent) {
              await advanceFn({ data: { surah: s, ayah: a + 1 } });
              navigate({ to: "/ayah/$surah/$ayah", params: { surah, ayah: String(a + 1) }, search: { from: "home" } });
            }
          }}
        />
      )}

      {carryFlow && (
        <CarryForwardSheet
          intentionId={carryFlow.intentionId}
          onClose={() => setCarryFlow(null)}
          onSaved={() => { setCarryFlow(null); qc.invalidateQueries(); }}
        />
      )}
    </AppShell>
  );
}

function IconPill({
  label,
  icon,
  color,
  glow,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  color: string;
  glow?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`interactive relative inline-flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 text-[10px] font-medium ${
        active
          ? "border-current/60 bg-[color:var(--surface-2)] shadow-[var(--shadow-inner-soft)]"
          : "border-border/60 bg-secondary/40"
      }`}
      style={{ color }}
    >
      <span className="relative inline-flex size-6 items-center justify-center">
        {glow && (
          <span
            className="absolute inset-0 -z-10 animate-ping rounded-full"
            style={{ background: `color-mix(in oklab, ${color} 50%, transparent)` }}
          />
        )}
        {icon}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

function LiveSheet({
  surah,
  ayah,
  existingActive,
  onClose,
  onSet,
}: {
  surah: number;
  ayah: number;
  existingActive: { surah: number; ayah: number } | null;
  onClose: () => void;
  onSet: (whenIso: string) => void;
}) {
  const suggestFn = useServerFn(generateLiveSuggestion);
  const createFn = useServerFn(createIntention);

  const [text, setText] = useState("");
  const [usedAi, setUsedAi] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  // Default reminder: tomorrow 9am
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);
  const [reminderLocal, setReminderLocal] = useState(defaultDate);

  const suggest = useMutation({
    mutationFn: () => suggestFn({ data: { surah, ayah } }),
    onSuccess: (res) => {
      if (res.ok) {
        setText(res.suggestion);
        setUsedAi(true);
      }
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const reminderAt = new Date(reminderLocal).toISOString();
      const res = await createFn({
        data: {
          surah,
          ayah,
          kind: usedAi ? "ai" : "custom",
          text: text.trim(),
          reminderAt,
          onConflict: confirmReplace || !existingActive ? "replace" : "skip",
        },
      });
      return { res, reminderAt };
    },
    onSuccess: ({ res, reminderAt }) => {
      if (!res.ok) {
        setConfirmReplace(true);
        return;
      }
      onSet(reminderAt);
    },
  });

  const conflict = existingActive && !confirmReplace;

  return (
    <BottomSheet title="Live this ayah" onClose={onClose}>
      <p className="text-base font-medium tracking-tight">How will you live this ayah today?</p>
      <p className="mt-1 text-xs text-muted-foreground">A small, gentle action. One ayah, one intention.</p>

      {conflict && (
        <div className="mt-4 rounded-2xl border border-border bg-accent/30 p-3 text-xs">
          You are still carrying an intention from {existingActive.surah}:{existingActive.ayah}.
          <button
            onClick={() => setConfirmReplace(true)}
            className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground"
          >
            Replace
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => suggest.mutate()}
          disabled={suggest.isPending}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs text-foreground/80 transition hover:bg-secondary disabled:opacity-50"
        >
          {suggest.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Suggest a small action
        </button>
        {usedAi && text && (
          <button onClick={() => { setText(""); setUsedAi(false); }} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            Write your own
          </button>
        )}
      </div>
      {suggest.data && !suggest.data.ok && (
        <p className="mt-2 text-xs text-muted-foreground">Couldn't generate a suggestion — write your own.</p>
      )}

      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setUsedAi(false); }}
        placeholder="A small, specific action for today."
        className="mt-3 min-h-[100px] w-full rounded-2xl border border-border bg-background/60 p-3 text-sm"
      />

      <label className="mt-4 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Remind me at
      </label>
      <input
        type="datetime-local"
        value={reminderLocal}
        onChange={(e) => setReminderLocal(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background/60 px-3 py-2.5 text-sm"
      />

      <button
        onClick={() => submit.mutate()}
        disabled={!text.trim() || submit.isPending || !reminderLocal}
        className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--gradient-primary)] px-6 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-50"
      >
        {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : "Set Intention"}
      </button>
    </BottomSheet>
  );
}

function ConfirmDialog({ when, onClose }: { when: string; onClose: () => void }) {
  const formatted = new Date(when).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 text-center shadow-[var(--shadow-elevated)]">
        <div className="mx-auto mb-3 inline-flex size-10 items-center justify-center rounded-full bg-[oklch(0.74_0.14_168_/_0.15)] text-[color:var(--emerald)]">
          <Check className="size-5" />
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          I will remind you of this niyyah at <span className="font-medium">{formatted}</span>.
        </p>
        <button
          onClick={onClose}
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-2xl bg-secondary px-4 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

const CELEBRATE_MESSAGES = [
  "Alhamdulillah. Small consistent steps matter.",
  "May this ayah slowly become part of you.",
  "Even small efforts are beloved.",
  "One lived ayah is precious.",
  "May Allah make it settle gently in your life.",
];

function LivedFlow({
  phase,
  intentionId,
  onAdvancePhase,
  onCloseStay,
  onDoneAdvance,
}: {
  phase: "celebrate" | "reflect";
  intentionId: string;
  onAdvancePhase: () => void;
  onCloseStay: () => void;
  onDoneAdvance: () => void;
}) {
  const markLivedFn = useServerFn(markLived);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);

  const message = useMemo(
    () => CELEBRATE_MESSAGES[Math.floor(Math.random() * CELEBRATE_MESSAGES.length)],
    []
  );

  if (phase === "celebrate") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onCloseStay} aria-hidden />
        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-border/60 bg-card p-7 text-center shadow-[var(--shadow-elevated)]">
          <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-[oklch(0.74_0.14_168_/_0.15)] text-[color:var(--emerald)]">
            <Heart className="size-5" />
          </div>
          <p className="text-base leading-relaxed text-foreground/90">{message}</p>
          <button
            onClick={onAdvancePhase}
            className="interactive mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--gradient-primary)] text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)]"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Reflect phase
  const completeAndAdvance = async (withReflection: boolean) => {
    setSaving(true);
    try {
      await markLivedFn({
        data: {
          intentionId,
          reflection: withReflection && reflection.trim() ? reflection.trim() : undefined,
        },
      });
      onDoneAdvance();
    } finally {
      setSaving(false);
    }
  };

  // Closing via × marks the intention completed but stays on this ayah.
  const completeAndStay = async () => {
    setSaving(true);
    try {
      await markLivedFn({
        data: {
          intentionId,
          reflection: reflection.trim() ? reflection.trim() : undefined,
        },
      });
      onCloseStay();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={completeAndStay} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]">Reflection</p>
            <h3 className="mt-1 text-base font-medium tracking-tight">Would you like to reflect on this ayah?</h3>
          </div>
          <button
            onClick={completeAndStay}
            aria-label="Close"
            className="interactive inline-flex size-8 items-center justify-center rounded-full bg-secondary/60 text-foreground/80"
          >
            <X className="size-4" />
          </button>
        </div>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Optional. A few words on how this ayah landed."
          className="mt-4 min-h-[120px] w-full rounded-2xl border border-border bg-background/60 p-3 text-sm"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => completeAndAdvance(false)}
            disabled={saving}
            className="interactive flex-1 rounded-2xl bg-secondary py-3 text-sm disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={() => completeAndAdvance(true)}
            disabled={saving}
            className="interactive flex-1 rounded-2xl bg-[var(--gradient-primary)] py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CarryForwardSheet({
  intentionId,
  onClose,
  onSaved,
}: {
  intentionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const carryFn = useServerFn(carryForward);
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);
  const [reminderLocal, setReminderLocal] = useState(defaultDate);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const reminderAt = reminderLocal ? new Date(reminderLocal).toISOString() : undefined;
      await carryFn({ data: { intentionId, reminderAt } });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]">Carry forward</p>
            <h3 className="mt-1 text-base font-medium tracking-tight">When should this ayah find you again?</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="interactive inline-flex size-8 items-center justify-center rounded-full bg-secondary/60 text-foreground/80"
          >
            <X className="size-4" />
          </button>
        </div>
        <label className="mt-5 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Remind me at
        </label>
        <input
          type="datetime-local"
          value={reminderLocal}
          onChange={(e) => setReminderLocal(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-border bg-background/60 px-3 py-2.5 text-sm"
        />
        <button
          onClick={save}
          disabled={saving || !reminderLocal}
          className="interactive mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--gradient-primary)] text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Save & carry forward"}
        </button>
      </div>
    </div>
  );
}

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative z-10 w-full max-w-2xl rounded-t-3xl border-t border-x border-border/60 bg-card shadow-[var(--shadow-elevated)]"
        style={{ transform: `translateY(${Math.max(0, dragY)}px)`, transition: startY === null ? "transform 200ms ease" : "none", maxHeight: "85vh" }}
        onTouchStart={(e) => setStartY(e.touches[0].clientY)}
        onTouchMove={(e) => {
          if (startY === null) return;
          const dy = e.touches[0].clientY - startY;
          setDragY(dy);
        }}
        onTouchEnd={() => {
          if (dragY > 120) {
            onClose();
          }
          setStartY(null);
          setDragY(0);
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-8 items-center justify-center rounded-full bg-secondary/60 text-foreground/80 hover:text-foreground"
          >
            <ChevronDown className="size-5" />
          </button>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--gold)]">{title}</p>
          <span className="size-8" />
        </div>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border/70" />
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-8">{children}</div>
      </div>
    </div>
  );
}
