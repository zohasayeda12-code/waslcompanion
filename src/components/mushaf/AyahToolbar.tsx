import { useFloating, offset, flip, shift, arrow, autoUpdate } from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { Bookmark, Heart, Highlighter, Maximize2, NotebookPen } from "lucide-react";

export type ToolbarAction = "reflection" | "live" | "bookmark" | "expand" | "highlight";

type Props = {
  anchor: HTMLElement | null;
  bookmarked?: boolean;
  isActiveIntention?: boolean;
  onAction: (a: ToolbarAction) => void;
  onClose: () => void;
};

export function AyahToolbar({ anchor, bookmarked, isActiveIntention, onAction, onClose }: Props) {
  const arrowRef = useRef<SVGSVGElement | null>(null);
  const { refs, floatingStyles, context, placement } = useFloating({
    placement: "top",
    middleware: [offset(10), flip(), shift({ padding: 8 }), arrow({ element: arrowRef })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference(anchor);
  }, [anchor, refs]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const floating = refs.floating.current;
      if (floating && (floating === target || floating.contains(target))) return;
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
  }, [anchor, onClose, refs.floating]);

  return (
    <AnimatePresence>
      {anchor && (
        <motion.div
          ref={refs.setFloating}
          style={floatingStyles}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="z-50"
          context-placement={placement}
        >
          <div className="glass-strong flex items-center gap-1 rounded-full px-1.5 py-1">
            <ToolbarButton label="Reflection" onClick={() => onAction("reflection")}>
              <NotebookPen className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Live this ayah"
              onClick={() => onAction("live")}
              accent="rose"
              glow={isActiveIntention}
            >
              <Heart className="size-4" />
            </ToolbarButton>
            <ToolbarButton label={bookmarked ? "Remove bookmark" : "Bookmark"} onClick={() => onAction("bookmark")}>
              <Bookmark className={`size-4 ${bookmarked ? "fill-current text-[color:var(--gold)]" : ""}`} />
            </ToolbarButton>
            <ToolbarButton label="Expand" onClick={() => onAction("expand")}>
              <Maximize2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Highlight" onClick={() => onAction("highlight")}>
              <Highlighter className="size-4" />
            </ToolbarButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToolbarButton({
  children,
  label,
  onClick,
  accent,
  glow,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: "rose";
  glow?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`interactive relative inline-flex size-8 items-center justify-center rounded-full text-foreground/85 hover:text-foreground ${
        accent === "rose" ? "text-[color:var(--rose)]" : ""
      }`}
    >
      {glow && (
        <span
          aria-hidden
          className="mushaf-active-glow pointer-events-none absolute inset-0 -z-10 animate-ping rounded-full"
          style={{ background: "color-mix(in oklab, var(--rose) 50%, transparent)" }}
        />
      )}
      {children}
    </button>
  );
}
