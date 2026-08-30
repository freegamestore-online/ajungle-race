import { useState } from "react";

export function useHighScore(key: string): [number, (s: number) => void] {
  const [best, setBest] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(key) ?? "0", 10) || 0; }
    catch { return 0; }
  });
  const set = (s: number) => {
    if (s > best) {
      setBest(s);
      try { localStorage.setItem(key, String(s)); } catch { /* ignore */ }
    }
  };
  return [best, set];
}
