import { useEffect, useState } from "react";

const KEY = "wasl.mushafTheme";
export type MushafTheme = "night" | "day";

export function useMushafTheme(): [MushafTheme, (t: MushafTheme) => void] {
  const [theme, setTheme] = useState<MushafTheme>("night");

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "day" || v === "night") setTheme(v);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("mushaf-day", theme === "day");
    return () => {
      document.body.classList.remove("mushaf-day");
    };
  }, [theme]);

  const update = (t: MushafTheme) => {
    setTheme(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {}
  };

  return [theme, update];
}
