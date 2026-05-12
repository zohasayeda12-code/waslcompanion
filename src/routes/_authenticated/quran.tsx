import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/quran")({
  head: () => ({ meta: [{ title: "Quran — Wasl" }] }),
  component: QuranIndex,
});

function QuranIndex() {
  return (
    <AppShell>
      <header>
        <Link to="/home" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">Quran</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse any sūrah. Coming soon — full reader with toolbar.</p>
      </header>
      <ul className="mt-6 grid grid-cols-3 gap-2 text-sm">
        {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <Link
              to="/ayah/$surah/$ayah"
              params={{ surah: String(n), ayah: "1" }}
              search={{ from: "quran" }}
              className="block rounded-2xl bg-secondary p-3 text-center"
            >
              {n}
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
