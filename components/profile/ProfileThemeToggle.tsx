"use client";

import { Moon, Sun } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "tik-booth-theme";
const themeListeners = new Set<() => void>();

function subscribeToTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function getThemeSnapshot(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark"): void {
  document.documentElement.dataset.theme = theme;
  themeListeners.forEach((listener) => listener());
}

export function ProfileThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");
  const isDark = theme === "dark";
  const [storageError, setStorageError] = useState(false);

  function toggleTheme(): void {
    const nextTheme = isDark ? "light" : "dark";
    applyTheme(nextTheme);
    setStorageError(false);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error("[ProfileThemeToggle] Unable to save theme preference.", error);
      setStorageError(true);
    }
  }

  const switchColor = isDark ? "border-brand bg-brand" : "border-border bg-sunken";
  const thumbPosition = isDark ? "translate-x-5" : "translate-x-1";

  return (
    <div className="border-b border-border py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
          {isDark ? (
            <Moon aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Sun aria-hidden="true" className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-bold text-ink">Appearance</span>
          <span className="mt-1 block text-[10px] font-medium text-ink-3">
            Choose light or dark mode for this browser.
          </span>
        </span>
        <button
          aria-checked={isDark}
          aria-label="Dark mode"
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-line ${switchColor}`}
          onClick={toggleTheme}
          role="switch"
          type="button"
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full border border-border bg-surface shadow-sm transition-transform ${thumbPosition}`}
          />
        </button>
      </div>
      {storageError ? (
        <p className="mt-2 text-[10px] font-medium text-live" role="status">
          Theme changed for now, but this browser could not save your preference.
        </p>
      ) : null}
    </div>
  );
}
