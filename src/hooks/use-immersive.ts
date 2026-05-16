import { useEffect, useSyncExternalStore } from "react";

// Tiny global store for "immersive mode" — used to hide chrome
// (like the bottom nav) when contextual reading interactions are active.

let active = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
  if (typeof document !== "undefined") {
    document.body.classList.toggle("immersive", active > 0);
  }
}

export function pushImmersive() {
  active += 1;
  emit();
}
export function popImmersive() {
  active = Math.max(0, active - 1);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return active > 0;
}
function getServerSnapshot() {
  return false;
}

export function useIsImmersive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Declarative helper: mounted while the caller wants immersive mode on. */
export function useImmersiveWhen(on: boolean) {
  useEffect(() => {
    if (!on) return;
    pushImmersive();
    return () => popImmersive();
  }, [on]);
}
