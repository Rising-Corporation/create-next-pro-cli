"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./Button";
import { useLocale, useTranslations } from "next-intl";

const themeChangeEvent = "template-theme-change";

function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerThemeSnapshot() {
  return "light";
}

function subscribeToThemeChange(onStoreChange: () => void) {
  window.addEventListener(themeChangeEvent, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(themeChangeEvent, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
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
    const storedTheme = localStorage.getItem("theme");
    const shouldUseDark = storedTheme
      ? storedTheme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    applyTheme(shouldUseDark);
  }, [locale]);

  return (
    <Button
      onClick={() => applyTheme(!isDark)}
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
