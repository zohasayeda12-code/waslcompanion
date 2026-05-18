/**
 * AmbientCanvas — slow drifting aurora layer behind the app.
 * Pure CSS, GPU-only, respects prefers-reduced-motion via .animate-aurora.
 *
 * Each bloom drifts on its own loop so the background feels gently alive
 * without ever calling attention to itself.
 */
export function AmbientCanvas() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Violet bloom — top left */}
      <div
        className="animate-aurora absolute -left-[20%] -top-[15%] size-[70vmax] rounded-full opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.55 0.18 295 / 0.55), transparent 70%)",
          animationDuration: "32s",
        }}
      />
      {/* Emerald bloom — right */}
      <div
        className="animate-aurora absolute -right-[25%] top-[10%] size-[60vmax] rounded-full opacity-55 blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.55 0.16 168 / 0.55), transparent 70%)",
          animationDuration: "38s",
          animationDirection: "reverse",
          animationDelay: "-6s",
        }}
      />
      {/* Gold bloom — bottom */}
      <div
        className="animate-aurora absolute left-[20%] -bottom-[25%] size-[70vmax] rounded-full opacity-50 blur-2xl"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.70 0.16 60 / 0.45), transparent 70%)",
          animationDuration: "44s",
          animationDelay: "-12s",
        }}
      />
      {/* Soft breathing veil — almost imperceptible global pulse */}
      <div
        className="animate-pulse-slow absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 40%, oklch(0.74 0.10 220 / 0.10), transparent 70%)",
          animationDuration: "11s",
        }}
      />
      {/* Subtle vignette to anchor the device on larger screens */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 50%, transparent 40%, oklch(0 0 0 / 0.45) 100%)",
        }}
      />
    </div>
  );
}
