import { useFloating, offset, flip, shift, autoUpdate, FloatingPortal } from "@floating-ui/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2 } from "lucide-react";
import { listReflections, saveReflection, deleteReflection } from "@/lib/library.functions";

type Props = {
  anchor: HTMLElement;
  surah: number;
  ayah: number;
  onClose: () => void;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ReflectionPopover({ anchor, surah, ayah, onClose }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listReflections);
  const saveFn = useServerFn(saveReflection);
  const delFn = useServerFn(deleteReflection);

  const { data: reflections = [], isLoading } = useQuery({
    queryKey: ["reflections", surah, ayah],
    queryFn: () => listFn({ data: { surah, ayah } }),
  });
  const latest = reflections[0];

  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState("");
  useEffect(() => {
    if (latest && !editing) setBody(latest.body);
    if (!latest) setEditing(true);
  }, [latest, editing]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({ data: { surah, ayah, body: body.trim(), id: latest?.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reflections", surah, ayah] });
      setEditing(false);
    },
  });
  const remove = useMutation({
    mutationFn: () => delFn({ data: { id: latest!.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reflections", surah, ayah] }),
  });

  const { refs, floatingStyles } = useFloating({
    placement: "bottom",
    strategy: "fixed",
    transform: false,
    elements: { reference: anchor },
    middleware: [offset(12), flip({ fallbackPlacements: ["top"] }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (ref.current && (ref.current === target || ref.current.contains(target))) return;
      if (anchor === target || anchor.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [anchor, onClose]);

  return (
    <FloatingPortal>
      <AnimatePresence>
        <motion.div
          ref={(node) => {
            refs.setFloating(node);
            ref.current = node;
          }}
          style={floatingStyles}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="z-50 w-[min(22rem,calc(100vw-1.5rem))]"
        >
        <div className="mushaf-overlay rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Reflection · {surah}:{ayah}</p>

          {isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…
            </div>
          ) : !latest && !editing ? (
            <p className="mt-2 text-sm text-muted-foreground">No reflection yet.</p>
          ) : !editing ? (
            <>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{latest.body}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">Written {relativeTime(latest.created_at)}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="interactive rounded-full bg-secondary px-3 py-1 text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove.mutate()}
                  className="interactive inline-flex items-center gap-1 rounded-full bg-secondary/60 px-3 py-1 text-xs text-muted-foreground"
                >
                  <Trash2 className="size-3" /> Delete
                </button>
              </div>
            </>
          ) : (
            <>
              <textarea
                autoFocus
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a quiet reflection on this ayah."
                className="mt-2 min-h-[120px] w-full rounded-xl border border-border bg-card/60 p-3 text-sm"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                {latest && (
                  <button
                    onClick={() => {
                      setEditing(false);
                      setBody(latest.body);
                    }}
                    className="interactive rounded-full bg-secondary/60 px-3 py-1 text-xs text-muted-foreground"
                  >
                    Cancel
                  </button>
                )}
                <button
                  disabled={!body.trim() || save.isPending}
                  onClick={() => save.mutate()}
                  className="interactive rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
                >
                  {save.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
