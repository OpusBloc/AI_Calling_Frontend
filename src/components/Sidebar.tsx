"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LogOut, X } from "lucide-react";

import UserAvatar from "@/components/UserAvatar";
import { showSuccessNotification } from "@/hooks/useNotification";
import { CurrentUser, clearToken, getUser, onAuthChange } from "@/lib/auth";
import { navItems } from "./navItems";

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    return onAuthChange(sync);
  }, []);

  // Close the mobile drawer after navigating
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const handleLogout = () => {
    clearToken();
    showSuccessNotification("You have been signed out.", { title: "Signed out" });
    router.replace("/auth/login");
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-hairline bg-surface transition-transform duration-200 ease-out md:static md:translate-x-0",
          open ? "translate-x-0 shadow-lg" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-on-accent shadow-sm">
              OB
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight text-heading">Opus Bloc</span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Admin</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-heading md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Menu</p>
          <ul className="space-y-0.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent-bg font-semibold text-heading"
                        : "font-medium text-body hover:bg-surface-hover hover:text-heading",
                    )}
                  >
                    {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent" />}
                    <Icon size={18} className={active ? "text-accent-text" : "text-muted"} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Signed-in user */}
        <div className="border-t border-hairline p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            {user && <UserAvatar user={user} size={34} />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-heading">{user?.full_name || "Admin"}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="rounded-md p-2 text-muted transition-colors hover:bg-loss-bg hover:text-loss"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
