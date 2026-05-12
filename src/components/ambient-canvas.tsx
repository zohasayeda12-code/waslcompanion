/**
 * AmbientCanvas — slow drifting aurora layer behind the app.
 * Pure CSS, GPU-only, respects prefers-reduced-motion via .animate-aurora.
 */
export function AmbientCanvas() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Violet bloom — top left */}
      <div
        className="absolute -left-[20%] -top-[15%] size-[70vmax] rounded-full opacity-60 blur-3xl animate-aurora"
        style={{
          background:
            "radial-gradient(closest-side, oklch(0.55 0.18 295 / 0.55), transparent 70%)",
        }}
      />
      {/* Emerald bloom — right */}
      <div
        className="absolute -right-[25%] top-[10%] size-[60vmax] rounded-full opacity-55 blur-3xl animate-aurora"
        style={{
          animationDelay: "-9s",
          background:
            "radial-gradient(closest-side, oklch(0.55 0.16 168 / 0.55), transparent 70%)",
        }}
      />
      {/* Gold bloom — bottom */}
      <div
        className="absolute left-[20%] -bottom-[25%] size-[70vmax] rounded-full opacity-50 blur-3xl animate-aurora"
        style={{
          animationDelay: "-18s",
          background:
            "radial-gradient(closest-side, oklch(0.70 0.16 60 / 0.45), transparent 70%)",
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
