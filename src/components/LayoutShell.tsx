"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { markInAppNavigation } from "@/components/ui";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef<string | null>(null);

  // After navigating, move focus to the new page and scroll it to the top
  useEffect(() => {
    const from = previousPath.current;
    previousPath.current = pathname;
    if (from === null) return;
    // Arriving from the login screen isn't a page to go "back" to
    if (!from.startsWith("/auth")) markInAppNavigation();
    mainRef.current?.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  if (pathname.startsWith("/auth")) return <>{children}</>;

  return (
    <div className="flex h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-heading focus:shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar open={menuOpen} onClose={closeMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
