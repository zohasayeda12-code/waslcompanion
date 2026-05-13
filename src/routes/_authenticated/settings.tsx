import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { usePureMode } from "@/hooks/use-pure-mode";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Wasl" }] }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const [pure, setPure] = usePureMode();

  return (
    <AppShell>
      <header>
        <Link to="/home" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quiet preferences for your time with the Qurʾān.
        </p>
      </header>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="text-sm font-medium">Pure Quran Mode</p>
            <p className="text-xs text-muted-foreground">
              Hide highlights, dots, and tools while reading.
            </p>
          </div>
          <Switch checked={pure} onCheckedChange={setPure} />
        </div>

        <form method="post" action="/api/auth/logout">
          <button
            type="submit"
            className="w-full rounded-2xl border border-border bg-card p-4 text-left text-sm hover:bg-accent/30"
          >
            Sign out
          </button>
        </form>
      </section>
    </AppShell>
  );
}
