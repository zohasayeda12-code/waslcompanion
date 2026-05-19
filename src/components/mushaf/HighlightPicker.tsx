import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { setHighlight } from "@/lib/highlights.functions";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    strategy: "fixed",
    transform: false,
    middleware: [offset(8), flip({ fallbackPlacements: ["top", "right", "left"] }), shift({ padding: 8 })],
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
        initial={{ opacity: 0, scale: 0.8, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -4 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="z-50"
      >
        <div className="mushaf-overlay flex flex-col items-center gap-1.5 rounded-full px-1.5 py-2">
          <TooltipProvider delayDuration={0}>
            {SWATCHES.map((s, i) => (
              <Tooltip key={s.color}>
                <TooltipTrigger asChild>
                  <motion.button
                    aria-label={s.label}
                    onClick={() => apply.mutate(s.color)}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.035, duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="interactive size-5 rounded-full border border-white/15 shadow-[0_2px_6px_oklch(0_0_0_/_0.35)] hover:scale-110"
                    style={{
                      background: `color-mix(in oklab, var(--hl-${s.color}) 75%, transparent)`,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="right" align="center">{s.label}</TooltipContent>
              </Tooltip>
            ))}
            <span className="my-0.5 h-px w-4 bg-border/60" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => apply.mutate(null)}
                  aria-label="Remove highlight"
                  className="interactive flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <span className="block h-px w-3 bg-current" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">Remove</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
