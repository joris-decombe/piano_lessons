"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";

export type Theme = "cool" | "warm" | "mono";

const THEME_STORAGE_KEY = "piano_lessons_theme";

// Helper to get initial theme (runs once)
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "cool";
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored && ["cool", "warm", "mono"].includes(stored)) {
    return stored;
  }
  return "cool";
}

// Store for theme state
let currentTheme: Theme = "cool";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentTheme;
}

function getServerSnapshot() {
  return "cool" as Theme;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Initialize theme on mount
  useEffect(() => {
    const initial = getInitialTheme();
    if (initial !== currentTheme) {
      currentTheme = initial;
      document.documentElement.setAttribute("data-theme", initial);
      listeners.forEach((cb) => cb());
    } else {
      // Just ensure the attribute is set
      document.documentElement.setAttribute("data-theme", currentTheme);
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    currentTheme = newTheme;
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    listeners.forEach((cb) => cb());
  }, []);

  return { theme, setTheme };
}

// Theme metadata for UI
export const THEMES: { id: Theme; name: string; description: string }[] = [
  { id: "cool", name: "Cyber", description: "Neon cyan & rose" },
  { id: "warm", name: "Vintage", description: "Amber & ivory" },
  { id: "mono", name: "Terminal", description: "Phosphor green" },
];
