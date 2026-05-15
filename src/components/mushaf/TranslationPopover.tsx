import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { getAyah } from "@/lib/qf-content.functions";

type Props = {
  anchor: HTMLElement;
  surah: number;
  ayah: number;
  onClose: () => void;
};

export function TranslationPopover({ anchor, surah, ayah, onClose }: Props) {
  const getAyahFn = useServerFn(getAyah);
  const { data, isLoading, error } = useQuery({
    queryKey: ["ayah-translation", surah, ayah],
    queryFn: () => getAyahFn({ data: { surah, ayah } }),
    staleTime: 60 * 60 * 1000,
  });

  const { refs, floatingStyles } = useFloating({
    placement: "bottom",
    strategy: "fixed",
    middleware: [offset(8), flip({ fallbackPlacements: ["top"] }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  useEffect(() => refs.setReference(anchor), [anchor, refs]);

  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (ref.current && (ref.current === target || ref.current.contains(target))) return;
      if (anchor === target || anchor.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  return (
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
        className="z-50 w-[min(24rem,calc(100vw-1.5rem))]"
      >
        <div className="rounded-2xl border border-border/60 bg-popover/95 p-4 shadow-[var(--shadow-elevated)] backdrop-blur-md">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Translation · {surah}:{ayah}
          </p>
          {isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> loading…
            </div>
          ) : error ? (
            <p className="mt-2 text-sm text-muted-foreground">Couldn't load translation.</p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {data?.translation || "No translation available."}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
