"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun } from "lucide-react";

import { navItems } from "./navItems";

const THEME_KEY = "theme";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const current = navItems.find((item) => pathname.startsWith(item.href));
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
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface/80 px-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className="-ml-1.5 rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-heading md:hidden"
        >
          <Menu size={20} />
        </button>
        {current && (
          <span className="flex items-center gap-2 text-sm font-medium text-muted">
            <current.icon size={16} />
            {current.label}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        title={dark ? "Light theme" : "Dark theme"}
        className="rounded-md border border-hairline p-2 text-muted transition-colors hover:bg-surface-hover hover:text-heading"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
