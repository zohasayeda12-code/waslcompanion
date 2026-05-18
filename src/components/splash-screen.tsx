import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

/**
 * SplashScreen — premium launch splash.
 * - Same atmospheric night canvas as the rest of the app
 * - Animated moon with subtle breathing glow
 * - Tiny floating particles
 * - "WASL" wordmark fades in using the aurora gradient (matches the
 *   "awaits." accent on onboarding screen 3)
 * - Smooth dissolve out into the app
 *
 * Duration: ~1.6s, shown once per browser session.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("wasl_splash_shown")) return;
    sessionStorage.setItem("wasl_splash_shown", "1");
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Stable particle field
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: 40 + Math.random() * 50,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 1.2,
        duration: 3 + Math.random() * 2.5,
        drift: -20 - Math.random() * 30,
      })),
    [],
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "var(--gradient-night-canvas)" }}
        >
          {/* aurora veil — very subtle so background stays dark */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-25 blur-3xl"
            style={{ background: "var(--gradient-aurora)" }}
          />

          {/* floating particles */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {particles.map((p) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: [0, 0.8, 0], y: p.drift }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className="absolute rounded-full bg-white"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  filter: "blur(0.4px)",
                  boxShadow: "0 0 8px oklch(0.95 0.05 82 / 0.6)",
                }}
              />
            ))}
          </div>

          {/* moon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex size-32 items-center justify-center"
          >
            {/* breathing halo */}
            <motion.div
              aria-hidden
              animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.88 0.12 82 / 0.55), transparent 70%)",
              }}
            />
            <motion.div
              aria-hidden
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-4 rounded-full blur-md"
              style={{
                background:
                  "radial-gradient(circle, oklch(0.92 0.10 82 / 0.75), transparent 75%)",
              }}
            />
            {/* moon body */}
            <svg
              viewBox="0 0 64 64"
              className="relative size-16"
              fill="none"
              stroke="oklch(0.92 0.10 82)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M48 32a18 18 0 1 1-18-18 14 14 0 0 0 18 18z" />
            </svg>
          </motion.div>

          {/* wordmark */}
          <motion.h1
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="text-aurora mt-10 text-7xl font-bold tracking-[0.28em]"
          >
            WASL
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
