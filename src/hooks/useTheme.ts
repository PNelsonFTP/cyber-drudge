import { useEffect, useState } from "react";

/**
 * src/hooks/useTheme.ts
 * ---------------------
 * Dark is the default for this site's Drudge-cosplayed-as-SOC aesthetic.
 * Choices: "dark" | "light" | "system". Persisted in localStorage; system
 * follows prefers-color-scheme and live-updates if the OS choice changes.
 */
export type ThemeChoice = "dark" | "light" | "system";

const KEY = "cyber-drudge:theme";

export function useTheme(): {
  theme: ThemeChoice;
  resolved: "dark" | "light";
  setTheme: (t: ThemeChoice) => void;
  cycle: () => void;
} {
  const [theme, setThemeState] = useState<ThemeChoice>(() => {
    try {
      const v = localStorage.getItem(KEY) as ThemeChoice | null;
      return v === "light" || v === "system" || v === "dark" ? v : "dark";
    } catch {
      return "dark";
    }
  });

  const resolved = useResolved(theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setThemeState((t) => (t === "system" ? "system" : t));
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: ThemeChoice) => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // ignore
    }
  };

  const cycle = () => {
    const order: ThemeChoice[] = ["dark", "light", "system"];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  return { theme, resolved, setTheme, cycle };
}

function useResolved(theme: ThemeChoice): "dark" | "light" {
  const [sysDark, setSysDark] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true
  );
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  if (theme === "system") return sysDark ? "dark" : "light";
  return theme;
}
