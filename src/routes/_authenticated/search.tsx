import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { searchQuran } from "@/lib/qf-content.functions";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — Wasl" }] }),
  component: Search,
});

function Search() {
  const fn = useServerFn(searchQuran);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ surah: number; ayah: number; preview: string }[]>([]);

  const run = async () => {
    if (!q.trim()) return;
    const refMatch = q.match(/^(\d+):(\d+)$/);
    if (refMatch) {
      setResults([{ surah: Number(refMatch[1]), ayah: Number(refMatch[2]), preview: "" }]);
      return;
    }
    const r = await fn({ data: { q } });
    setResults(r.results);
  };

  return (
    <AppShell>
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Search</h1>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="patience, mercy, 2:255…"
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm"
        />
        <button type="submit" className="rounded-2xl bg-primary px-4 text-sm text-primary-foreground">
          Go
        </button>
      </form>
      <ul className="mt-6 grid gap-2">
        {results.map((r, i) => (
          <li key={`${r.surah}-${r.ayah}-${i}`}>
            <Link
              to="/ayah/$surah/$ayah"
              params={{ surah: String(r.surah), ayah: String(r.ayah) }}
              search={{ from: "search" }}
              className="block rounded-2xl border border-border bg-card p-3 text-sm hover:bg-accent/30"
            >
              <span className="font-medium">{r.surah}:{r.ayah}</span>
              {r.preview && <span className="ml-2 text-muted-foreground">{r.preview.slice(0, 100)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
