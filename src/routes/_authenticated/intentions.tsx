import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { listAllIntentions, removeIntention, updateReminder } from "@/lib/intentions.functions";

export const Route = createFileRoute("/_authenticated/intentions")({
  head: () => ({ meta: [{ title: "Your Intentions — Wasl" }] }),
  component: Intentions,
});

function Intentions() {
  const qc = useQueryClient();
  const list = useServerFn(listAllIntentions);
  const removeFn = useServerFn(removeIntention);
  const updateFn = useServerFn(updateReminder);
  const { data: items = [] } = useQuery({ queryKey: ["intents-all"], queryFn: () => list() });

  return (
    <AppShell>
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Your intentions</h1>
      </header>
      <ul className="mt-6 grid gap-3">
        {items.map((it) => (
          <li key={it.id} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{it.status}</span>
              <span className="text-xs">{it.surah}:{it.ayah}</span>
            </div>
            <p className="mt-2">{it.text}</p>
            {it.reminder_at && (it.status === "pending" || it.status === "carried") && (
              <p className="mt-2 text-xs text-muted-foreground">Reminder: {new Date(it.reminder_at).toLocaleString()}</p>
            )}
            {(it.status === "pending" || it.status === "carried") && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={async () => {
                    const at = new Date(Date.now() + 4 * 3600_000).toISOString();
                    await updateFn({ data: { intentionId: it.id, reminderAt: at } });
                    qc.invalidateQueries();
                  }}
                  className="rounded-full bg-secondary px-3 py-1 text-xs"
                >
                  Snooze 4h
                </button>
                <button
                  onClick={async () => {
                    await removeFn({ data: { intentionId: it.id } });
                    qc.invalidateQueries();
                  }}
                  className="rounded-full bg-secondary px-3 py-1 text-xs"
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No intentions yet.</p>}
      </ul>
    </AppShell>
  );
}
