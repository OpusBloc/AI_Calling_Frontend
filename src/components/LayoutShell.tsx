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
    mainRef.current?.querySelector<HTMLElement>(".content-scroll")?.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  if (pathname.startsWith("/auth")) return <>{children}</>;

  return (
     <div className="grid h-screen grid-cols-1 gap-2 overflow-hidden bg-canvas p-4 lg:grid-cols-[280px_minmax(0,1fr)] ">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-heading focus:shadow-lg"
      >
        Skip to content
      </a>
      <Sidebar open={menuOpen} onClose={closeMenu} />
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-2 ">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main id="main" ref={mainRef} tabIndex={-1} className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-sm outline-none">
          <div className="content-scroll h-full overflow-y-auto px-5 py-5 pr-8 sm:px-6 sm:pr-9 lg:px-8 lg:pr-10 shadow-xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
