import { useEffect, useState, useCallback } from "react";
import type { AppSettings } from "../types";

type ThemeMode = "light" | "dark" | "system";

function applyThemeClass(isDark: boolean): void {
  const root = document.documentElement;
  if (isDark) root.classList.add("dark");
  else root.classList.remove("dark");
  root.style.colorScheme = isDark ? "dark" : "light";
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

export function useTheme(settings: Partial<AppSettings>) {
  const mode = (settings?.theme as ThemeMode) || "system";
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return resolveDark(mode);
  });

  useEffect(() => {
    const current = resolveDark(mode);
    setIsDark(current);
    applyThemeClass(current);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      applyThemeClass(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const toggle = useCallback(() => {
    const next: ThemeMode = mode === "dark" ? "light" : mode === "light" ? "system" : "dark";
    applyThemeClass(resolveDark(next));
  }, [mode]);

  return { mode, isDark, toggle };
}

export default useTheme;
