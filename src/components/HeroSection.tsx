"use client";

/**
 * STARTER SHELL — do not copy this file back into the main admin repo.
 *
 * A slim stand-in for the real `HeroSection.tsx` (dashboard sidebar + tabs).
 * It keeps the same login redirect, role gating and `?tab=` navigation, so a
 * tab built here behaves the same once it is moved into the main repo. See
 * README.md → "Merging back".
 */

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MdDashboard, MdLogout, MdOutlineConfirmationNumber } from "react-icons/md";
import { clearToken, getRoleFromToken } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui";
import ExampleTab from "@/components/profile/ExampleTab";

/**
 * Sidebar tabs, in order. `roles` lists who may open the tab:
 * ADMIN (full), ADMINISTRATIVE (everything ADMIN sees, read-only), SUPPORT.
 * Add your new tab here and render it in <main> below.
 */
const TABS = [
  { tab: "example", label: "Example", icon: <MdDashboard />, roles: ["ADMIN", "ADMINISTRATIVE"] },
  {
    tab: "example-support",
    label: "Example (support)",
    icon: <MdOutlineConfirmationNumber />,
    roles: ["ADMIN", "ADMINISTRATIVE", "SUPPORT"],
  },
] as const;

type Tab = (typeof TABS)[number]["tab"];

export default function ApprovalsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>(TABS[0].tab);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Same as the main repo: profile role first, JWT role as fallback.
  const role = String(user?.role || getRoleFromToken() || "").toUpperCase();
  const isSupport = role === "SUPPORT";
  const isReadOnly = role === "ADMINISTRATIVE";
  // Unknown roles are treated as ADMIN, as in the main repo.
  const roleKey = isSupport ? "SUPPORT" : isReadOnly ? "ADMINISTRATIVE" : "ADMIN";

  const allowedTabs = useMemo<Tab[]>(
    () => TABS.filter((t) => (t.roles as readonly string[]).includes(roleKey)).map((t) => t.tab),
    [roleKey],
  );
  const defaultTab: Tab = allowedTabs[0] ?? TABS[0].tab;

  // Expired token / backend down → back to login instead of a spinner.
  useEffect(() => {
    if (!authLoading && !user) {
      clearToken();
      router.replace("/auth/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const requested = (searchParams.get("tab") as Tab) || defaultTab;
    if (!allowedTabs.includes(requested)) {
      setActiveTab(defaultTab);
      router.replace(`/?tab=${defaultTab}`);
      return;
    }
    setActiveTab(requested);
  }, [allowedTabs, defaultTab, router, searchParams]);

  const goTab = (tab: Tab) => {
    if (!allowedTabs.includes(tab)) return;
    setSidebarOpen(false);
    setActiveTab(tab);
    window.history.pushState(null, "", `/?tab=${tab}`);
  };

  return (
    <div className="min-h-screen w-full flex bg-canvas">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
        className="md:hidden fixed top-3 left-3 z-[55] w-10 h-10 flex items-center justify-center rounded-md bg-surface border border-hairline shadow-sm"
      >
        <span className="flex flex-col gap-1">
          <span className="w-5 h-0.5 rounded bg-heading" />
          <span className="w-5 h-0.5 rounded bg-heading" />
          <span className="w-5 h-0.5 rounded bg-heading" />
        </span>
      </button>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-[58] bg-black/40 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-[60] h-screen w-72 bg-surface border-r border-hairline flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-16 shrink-0 flex items-center justify-between gap-2 px-5 border-b border-hairline">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md overflow-hidden shrink-0">
              <Image src="/assets/card-token.png" alt="Opus Bloc" width={32} height={32} className="object-cover" />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[13px] font-extrabold tracking-[0.22em] text-heading">OPUS BLOC</span>
              <span className="text-[11px] text-muted">Asset Platform · starter</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="md:hidden w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-heading transition-colors"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <nav className="nav-scroll flex flex-col gap-0.5 py-4 flex-1 min-h-0 overflow-y-auto">
          {authLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            TABS.filter((t) => allowedTabs.includes(t.tab)).map((t) => (
              <SidebarItem
                key={t.tab}
                label={t.label}
                icon={t.icon}
                active={activeTab === t.tab}
                onClick={() => goTab(t.tab)}
              />
            ))
          )}
        </nav>

        <div className="mt-auto shrink-0 border-t border-hairline px-3 py-4 flex flex-col gap-2 bg-surface">
          <Button
            type="button"
            variant="secondary"
            onClick={() => logout()}
            icon={<MdLogout className="text-lg shrink-0" />}
            align="start"
            className="w-full hover:border-loss hover:bg-loss-bg hover:text-loss"
          >
            Log out
          </Button>
        </div>
      </aside>

      <main className="ml-0 md:ml-72 mt-16 flex-1 min-w-0 bg-canvas overflow-hidden">
        {authLoading ? (
          <div className="flex justify-center items-center h-full min-h-[60vh]">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "example" && <ExampleTab readOnly={isReadOnly} />}
            {activeTab === "example-support" && <ExampleTab readOnly={isReadOnly} />}
          </>
        )}
      </main>
    </div>
  );
}

/* Same look as the main repo's SidebarItem. */
function SidebarItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mx-3 h-11 px-4 flex items-center gap-3 rounded-md text-sm font-medium transition-colors duration-200 ${
        active ? "bg-accent-bg text-accent-text font-semibold" : "text-body hover:bg-surface-hover hover:text-heading"
      }`}
    >
      <span className={`text-lg ${active ? "text-accent" : "text-muted"}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
