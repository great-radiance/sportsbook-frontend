// src/theme/ThemeContext.tsx
/** @jsxImportSource preact */
import { createContext } from "preact";
import type { ComponentChildren } from "preact";
import { useContext, useEffect, useMemo, useState } from "preact/hooks";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "stoiximan-theme";

function getInitialTheme(): Theme {
  // localStorage first
  const saved = window.localStorage.getItem(STORAGE_KEY);
  console.log("Saved theme from localStorage:", saved);
  if (saved === "light" || saved === "dark") return saved;

  // if already set on <html>
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  // // fallback to OS preference
  // const prefersDark =
  //   window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;

  // return prefersDark ? "dark" : "light";

  return "dark"; // default to light if no preference
}

export function ThemeProvider({ children }: { children: ComponentChildren }) {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () =>
    setThemeState((t) => (t === "dark" ? "light" : "dark"));

  // apply theme globally to <html> (so :root[data-theme="dark"] works)
  useEffect(() => {
    console.log("Applied theme:", theme);
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "theme" &&
        (e.newValue === "light" || e.newValue === "dark")
      ) {
        setThemeState(e.newValue); // updates UI in other tabs
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider />");
  return ctx;
}
