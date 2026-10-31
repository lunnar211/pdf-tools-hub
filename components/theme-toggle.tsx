"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setMounted(true), 0); return () => window.clearTimeout(t); }, []);
  if (!mounted) return <span className="min-h-[44px] min-w-[44px]" aria-hidden="true" />;
  const dark = theme === "dark";
  return (
    <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#0f766e] hover:bg-[#f0fdfa] dark:text-[#5eead4] dark:hover:bg-teal-950">
      {dark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
    </button>
  );
}
