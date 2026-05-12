import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/primary-button";
import { createIntention, getActiveIntention } from "@/lib/intentions.functions";
import { generateLiveSuggestion } from "@/lib/live-suggestion.functions";

export const Route = createFileRoute("/_authenticated/live/$surah/$ayah")({
  head: ({ params }) => ({ meta: [{ title: `Live ${params.surah}:${params.ayah} — Wasl` }] }),
  component: LiveScreen,
});

function LiveScreen() {
  const { surah, ayah } = Route.useParams();
  const s = Number(surah);
  const a = Number(ayah);
  const navigate = useNavigate();
  const createFn = useServerFn(createIntention);
  const activeFn = useServerFn(getActiveIntention);
  const { data: active } = useQuery({ queryKey: ["active-intention"], queryFn: () => activeFn() });

  const suggestFn = useServerFn(generateLiveSuggestion);

  const [text, setText] = useState("");
  const [usedAi, setUsedAi] = useState(false);
  const [reminderHours, setReminderHours] = useState(8);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const suggest = useMutation({
    mutationFn: () => suggestFn({ data: { surah: s, ayah: a } }),
    onSuccess: (res) => {
      if (res.ok) {
        setText(res.suggestion);
        setUsedAi(true);
      }
    },
  });

  const conflict = active && (active.surah !== s || active.ayah !== a);

  const submit = async (kind: "ai" | "custom", body: string, replace: boolean) => {
    const reminderAt = new Date(Date.now() + reminderHours * 3600_000).toISOString();
    const res = await createFn({
      data: { surah: s, ayah: a, kind, text: body, reminderAt, onConflict: replace ? "replace" : "skip" },
    });
    if (!res.ok) {
      setConfirmReplace(true);
      return;
    }
    navigate({ to: "/ayah/$surah/$ayah", params: { surah, ayah }, search: { from: "home" } });
  };

  return (
    <AppShell>
      <header className="flex items-center justify-between">
        <button onClick={() => navigate({ to: "/ayah/$surah/$ayah", params: { surah, ayah }, search: { from: "home" } })} className="text-sm text-muted-foreground">
          ← Back
        </button>
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live {s}:{a}</span>
      </header>

      <section className="mt-8">
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">How will you live this ayah today?</h1>
        <p className="mt-3 text-sm text-muted-foreground">A small, gentle action. One ayah, one intention.</p>
      </section>

      {conflict && !confirmReplace && (
        <div className="mt-6 rounded-2xl border border-border bg-accent/30 p-4 text-sm">
          You are still carrying an intention from {active!.surah}:{active!.ayah}.
          <div className="mt-3 flex gap-2">
            <button onClick={() => navigate({ to: "/ayah/$surah/$ayah", params: { surah: String(active!.surah), ayah: String(active!.ayah) }, search: { from: "home" } })} className="rounded-full bg-secondary px-3 py-1">
              Continue Current
            </button>
            <button onClick={() => setConfirmReplace(true)} className="rounded-full bg-primary px-3 py-1 text-primary-foreground">
              Replace With This Ayah
            </button>
          </div>
        </div>
      )}

      <section className="mt-8">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., I will be patient with my family today."
          className="min-h-[120px] w-full rounded-2xl border border-border bg-card p-4 text-base"
        />
        <label className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          Remind me in
          <select value={reminderHours} onChange={(e) => setReminderHours(Number(e.target.value))} className="rounded-lg bg-secondary px-2 py-1">
            <option value={2}>2 hours</option>
            <option value={4}>4 hours</option>
            <option value={8}>8 hours</option>
            <option value={24}>1 day</option>
          </select>
        </label>
      </section>

      <footer className="mt-8 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <PrimaryButton
          onClick={() => text.trim() && submit("custom", text.trim(), confirmReplace || !conflict)}
          disabled={!text.trim()}
        >
          Set Intention
        </PrimaryButton>
      </footer>
    </AppShell>
  );
}
