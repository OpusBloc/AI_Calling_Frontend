"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type SidebarContextValue = {
  expanded: boolean;
  overlayOpen: boolean;
  isDesktop: boolean;
  toggle: () => void;
  closeMobile: () => void;
};

const STORAGE_KEY = "opus-sidebar";
const DESKTOP_QUERY = "(min-width: 1025px)";
const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setExpanded(root.dataset.sidebar !== "collapsed");
    setIsDesktop(window.matchMedia(DESKTOP_QUERY).matches);
    setReady(true);

    const media = window.matchMedia(DESKTOP_QUERY);
    const onMediaChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setOverlayOpen(false);
        delete root.dataset.sidebarOpen;
      }
    };
    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.sidebar = expanded ? "expanded" : "collapsed";
  }, [expanded, ready]);

  useEffect(() => {
    if (!overlayOpen) return;
    const root = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    root.dataset.sidebarOpen = "true";
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOverlayOpen(false);
        delete root.dataset.sidebarOpen;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      delete root.dataset.sidebarOpen;
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  const toggle = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setExpanded((current) => {
        const next = !current;
        document.documentElement.dataset.sidebar = next ? "expanded" : "collapsed";
        try {
          localStorage.setItem(STORAGE_KEY, next ? "expanded" : "collapsed");
        } catch {
          // Sidebar still works when storage is unavailable.
        }
        return next;
      });
      return;
    }

    setOverlayOpen((current) => {
      const next = !current;
      if (next) document.documentElement.dataset.sidebarOpen = "true";
      else delete document.documentElement.dataset.sidebarOpen;
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => {
    setOverlayOpen(false);
    delete document.documentElement.dataset.sidebarOpen;
  }, []);

  const value = useMemo(
    () => ({ expanded, overlayOpen, isDesktop, toggle, closeMobile }),
    [expanded, overlayOpen, isDesktop, toggle, closeMobile],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
}
