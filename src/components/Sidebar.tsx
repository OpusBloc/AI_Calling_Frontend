"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { LogOut } from "lucide-react";

import { clearToken } from "@/lib/auth";
import { navItems } from "./navItems";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.replace("/auth/login");
  };

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-surface">
      <div className="flex h-16 items-center px-6 text-lg font-semibold text-heading">Admin</div>
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-accent-bg text-accent-text"
                : "text-body hover:bg-surface-hover",
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-hairline p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-body transition-colors hover:bg-surface-hover"
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
