import { useEffect, useRef, useState } from "react";

/**
 * Returns true after `delayMs` of user inactivity (no scroll/click/keypress/touch).
 * Used to gently introduce the Live This Ayah glow once per ayah session.
 */
export function useIdleAfter(delayMs = 3000): boolean {
  const [idle, setIdle] = useState(false);
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    let t = setTimeout(() => {
      fired.current = true;
      setIdle(true);
    }, delayMs);
    const cancel = () => {
      clearTimeout(t);
      if (!fired.current) {
        t = setTimeout(() => {
          fired.current = true;
          setIdle(true);
        }, delayMs);
      }
    };
    const stop = () => {
      clearTimeout(t);
      setIdle(false);
      fired.current = true; // one-shot per session
      window.removeEventListener("scroll", stop, true);
      window.removeEventListener("pointerdown", stop, true);
      window.removeEventListener("keydown", stop, true);
      window.removeEventListener("touchstart", stop, true);
    };
    window.addEventListener("scroll", cancel, { passive: true, capture: true });
    window.addEventListener("pointerdown", stop, true);
    window.addEventListener("keydown", stop, true);
    window.addEventListener("touchstart", stop, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", cancel, true);
      window.removeEventListener("pointerdown", stop, true);
      window.removeEventListener("keydown", stop, true);
      window.removeEventListener("touchstart", stop, true);
    };
  }, [delayMs]);
  return idle;
}
