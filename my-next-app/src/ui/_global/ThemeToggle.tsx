"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./Button";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Initial state from html class
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.add("light");
      html.classList.remove("dark");
      setIsDark(false);
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      html.classList.remove("light");
      setIsDark(true);
      localStorage.setItem("theme", "dark");
    }
  };

  useEffect(() => {
    // On mount, set theme from localStorage
    const theme = localStorage.getItem("theme");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      setIsDark(true);
    } else if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  return (
    <Button
      onClick={toggleTheme}
      className="ml-2 p-2 rounded-full hover:bg-white/10 transition-colors  "
      aria-label="Toggle theme"
      type="button"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
