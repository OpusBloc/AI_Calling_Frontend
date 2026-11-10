"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { markInAppNavigation } from "@/components/ui";

export default function LayoutShell({
  children,
  sidebar,
  topbar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
}) {
  const pathname = usePathname();
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
    <div className="ob-layout">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-heading focus:shadow-lg"
      >
        Skip to content
      </a>
      {sidebar}
      <div className="ob-main-column">
        {topbar}
        <main id="main" ref={mainRef} tabIndex={-1} className="min-h-0 flex-1 overflow-hidden bg-surface shadow-sm outline-none">
          <div className="content-scroll ob-main-content no-scrollbar">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
