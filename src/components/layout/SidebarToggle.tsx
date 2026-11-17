"use client";

import { useEffect, useState } from "react";
import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from "lucide-react";

import { useSidebar } from "@/context/SidebarContext";

export default function SidebarToggle({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const { expanded, overlayOpen, isDesktop, toggle } = useSidebar();
  const isExpanded = isDesktop ? expanded : overlayOpen;
  const SidebarIcon = isExpanded ? PanelLeftClose : PanelLeftOpen;

  return (
    <button
      type="button"
      className={`ob-sidebar-toggle ${mobileOnly ? "ob-mobile-sidebar-toggle" : "ob-sidebar-inner-toggle"}`}
      aria-label={isExpanded ? "Close sidebar" : "Open sidebar"}
      aria-expanded={isExpanded}
      aria-controls="primary-sidebar"
      onClick={toggle}
    >
      <SidebarIcon size={18} aria-hidden="true" />
    </button>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Theme still changes for this session when storage is unavailable.
    }
  };

  return (
    <button
      type="button"
      className="ob-sidebar-toggle ob-theme-toggle"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      onClick={toggleTheme}
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}
