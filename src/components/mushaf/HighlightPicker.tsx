import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { setHighlight } from "@/lib/highlights.functions";

type Color = "gold" | "blue" | "green" | "purple" | "rose";

const SWATCHES: { color: Color; label: string }[] = [
  { color: "gold", label: "Moved my heart" },
  { color: "blue", label: "Want to memorize" },
  { color: "green", label: "Lived this" },
  { color: "purple", label: "Need to revisit" },
  { color: "rose", label: "Made me weep" },
];

type Props = {
  anchor: HTMLElement;
  surah: number;
  ayah: number;
  onClose: () => void;
};

export function HighlightPicker({ anchor, surah, ayah, onClose }: Props) {
  const qc = useQueryClient();
  const setFn = useServerFn(setHighlight);

  const apply = useMutation({
    mutationFn: (color: Color | null) => setFn({ data: { surah, ayah, color } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["highlights-list"] });
      qc.invalidateQueries({ queryKey: ["highlight", surah, ayah] });
      onClose();
    },
  });

  const { refs, floatingStyles } = useFloating({
    placement: "bottom",
    middleware: [offset(10), flip(), shift({ padding: 8 })],
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
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
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
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.12 }}
        className="z-50"
      >
        <div className="rounded-2xl border border-border/60 bg-popover p-2 shadow-[var(--shadow-elevated)] backdrop-blur-md">
          <div className="flex items-center gap-1">
            {SWATCHES.map((s) => (
              <button
                key={s.color}
                aria-label={s.label}
                title={s.label}
                onClick={() => apply.mutate(s.color)}
                className="interactive size-8 rounded-full border border-border/60"
                style={{
                  background: `color-mix(in oklab, var(--hl-${s.color}) 65%, transparent)`,
                }}
              />
            ))}
            <span className="mx-1 h-6 w-px bg-border/60" />
            <button
              onClick={() => apply.mutate(null)}
              className="interactive rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
