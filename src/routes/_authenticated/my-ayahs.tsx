import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { listBookmarks, listReflections, listRevisited } from "@/lib/library.functions";
import { listHighlights } from "@/lib/highlights.functions";
import { listAllIntentions } from "@/lib/intentions.functions";

export const Route = createFileRoute("/_authenticated/my-ayahs")({
  head: () => ({ meta: [{ title: "My Ayahs — Wasl" }] }),
  component: MyAyahs,
});

function MyAyahs() {
  const bm = useServerFn(listBookmarks);
  const re = useServerFn(listReflections);
  const hl = useServerFn(listHighlights);
  const intents = useServerFn(listAllIntentions);
  const rv = useServerFn(listRevisited);
  const { data: bookmarks = [] } = useQuery({ queryKey: ["bookmarks"], queryFn: () => bm() });
  const { data: reflections = [] } = useQuery({ queryKey: ["reflections"], queryFn: () => re({ data: {} }) });
  const { data: highlights = [] } = useQuery({ queryKey: ["highlights"], queryFn: () => hl({ data: {} }) });
  const { data: allIntents = [] } = useQuery({ queryKey: ["intents-all"], queryFn: () => intents() });
  const { data: revisited = [] } = useQuery({ queryKey: ["revisited"], queryFn: () => rv() });
  const lived = allIntents.filter((i) => i.status === "lived");

  const Section = ({ title, items, from }: { title: string; items: { surah: number; ayah: number; key?: string; label?: string }[]; from: string }) => (
    <section className="mt-6">
      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground/70">Nothing yet.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {items.slice(0, 12).map((it, idx) => (
            <li key={it.key ?? `${it.surah}-${it.ayah}-${idx}`}>
              <Link
                to="/ayah/$surah/$ayah"
                params={{ surah: String(it.surah), ayah: String(it.ayah) }}
                search={{ from: from as any }}
                className="block rounded-2xl border border-border bg-card p-3 text-sm hover:bg-accent/30"
              >
                {it.surah}:{it.ayah} {it.label ? <span className="text-muted-foreground">— {it.label}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <AppShell>
      <header>
        <Link to="/home" className="text-sm text-muted-foreground">← Home</Link>
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">My Ayahs</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lived.length} ayahs lived in your journey.</p>
      </header>

      <Section title="Lived" items={lived.map((i) => ({ surah: i.surah, ayah: i.ayah, label: i.text }))} from="my-ayahs" />
      <Section title="Bookmarks" items={bookmarks} from="bookmarks" />
      <Section title="Highlights" items={highlights.map((h) => ({ surah: h.surah, ayah: h.ayah, label: h.color }))} from="highlights" />
      <Section title="Reflections" items={reflections.map((r) => ({ surah: r.surah, ayah: r.ayah, label: r.body.slice(0, 60) }))} from="reflections" />
      <Section title="Recently revisited" items={revisited} from="revisited" />
    </AppShell>
  );
}
