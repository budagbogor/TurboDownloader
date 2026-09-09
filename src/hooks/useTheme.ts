import { useEffect } from "react";

function applyLightThemeOnly(): void {
  const root = document.documentElement;
  root.classList.remove("dark");
  root.style.colorScheme = "light";
  root.style.setProperty("color-scheme", "light");
}

export function useTheme() {
  useEffect(() => {
    applyLightThemeOnly();
  }, []);

  return {
    mode: "light" as const,
    isDark: false as const,
    toggle: () => {},
  };
}

export default useTheme;
