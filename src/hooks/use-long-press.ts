import { useCallback, useRef } from "react";

type Opts = { ms?: number; moveTolerancePx?: number };

/**
 * Long-press hook — fires `onLongPress` after `ms` if the pointer hasn't
 * moved more than `moveTolerancePx` and hasn't been released. Cancelled by
 * scroll or pointercancel. Tap alone does nothing (preserves scroll).
 */
export function useLongPress(onLongPress: (e: PointerEvent) => void, opts: Opts = {}) {
  const ms = opts.ms ?? 500;
  const tol = opts.moveTolerancePx ?? 8;
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") return; // hover handles desktop
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      const native = e.nativeEvent;
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress(native);
      }, ms);
    },
    [ms, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (Math.abs(dx) > tol || Math.abs(dy) > tol) clear();
    },
    [clear, tol],
  );

  const onPointerUp = useCallback(() => clear(), [clear]);
  const onPointerCancel = useCallback(() => clear(), [clear]);
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Suppress the OS long-press context menu on touch.
      if (fired.current) e.preventDefault();
    },
    [],
  );

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu };
}
