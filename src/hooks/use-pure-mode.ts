import { useEffect, useState } from "react";

const KEY = "wasl.pureMode";

export function usePureMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      setOn(localStorage.getItem(KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("pure-mode", on);
    return () => {
      document.body.classList.remove("pure-mode");
    };
  }, [on]);

  const update = (v: boolean) => {
    setOn(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {}
  };

  return [on, update];
}
