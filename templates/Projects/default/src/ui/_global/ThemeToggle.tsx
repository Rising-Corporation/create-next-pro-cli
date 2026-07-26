"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./Button";
import { useLocale, useTranslations } from "next-intl";

type Theme = "dark" | "light";

const themeChangeEvent = "template-theme-change";

function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light";
}

function readStoredTheme(): Theme | null {
  try {
    const theme = localStorage.getItem("theme");
    return isTheme(theme) ? theme : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function setDocumentTheme(theme: Theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("light", !isDark);
}

function persistTheme(theme: Theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // The active document theme still works when storage is unavailable.
  }
}

function subscribeToThemeChange(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== "theme") return;

    setDocumentTheme(readStoredTheme() ?? getSystemTheme());
    onStoreChange();
  };

  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = (event: MediaQueryListEvent) => {
    if (readStoredTheme() !== null) return;

    setDocumentTheme(event.matches ? "dark" : "light");
    onStoreChange();
  };

  window.addEventListener(themeChangeEvent, onStoreChange);
  window.addEventListener("storage", handleStorage);
  colorScheme.addEventListener("change", handleSystemThemeChange);

  return () => {
    window.removeEventListener(themeChangeEvent, onStoreChange);
    window.removeEventListener("storage", handleStorage);
    colorScheme.removeEventListener("change", handleSystemThemeChange);
  };
}

function applyTheme(theme: Theme, persist: boolean) {
  setDocumentTheme(theme);
  if (persist) persistTheme(theme);
  window.dispatchEvent(new Event(themeChangeEvent));
}

export default function ThemeToggle() {
  const t = useTranslations("_global_ui");
  const locale = useLocale();
  const theme = useSyncExternalStore(
    subscribeToThemeChange,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const isDark = theme === "dark";

  useEffect(() => {
    applyTheme(readStoredTheme() ?? getSystemTheme(), false);
  }, [locale]);

  return (
    <Button
      onClick={() => applyTheme(isDark ? "light" : "dark", true)}
      className="rounded-full p-0 dark:hover:bg-white/10 light:hover:bg-black/10 transition-colors"
      aria-label={t("toggle_theme")}
      variant="ghost"
      size="icon"
      type="button"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-white" />
      ) : (
        <Moon className="h-5 w-5 text-black" />
      )}
    </Button>
  );
}
