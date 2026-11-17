"use client";

import { useEffect, useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";

import AppBreadcrumb from "@/components/layout/AppBreadcrumb";
import { useSidebar } from "@/context/SidebarContext";

const THEME_KEY = "theme";

export default function Navbar() {
  const { toggle } = useSidebar();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // theme just won't persist
    }
  };

  return (
    <header className="z-20 flex h-[52px] shrink-0 items-center justify-between gap-3 border border-hairline bg-surface/80 px-4 shadow-sm backdrop-blur sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Open menu"
          onClick={toggle}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-heading lg:hidden"
        >
          <Menu size={20} />
        </button>
        <AppBreadcrumb />
      </div>

      <button
        type="button"
        className="ob-sidebar-toggle ob-theme-toggle"
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        title={dark ? "Light theme" : "Dark theme"}
        onClick={toggleTheme}
      >
        {dark ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
      </button>
    </header>
  );
}
