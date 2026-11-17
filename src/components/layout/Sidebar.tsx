"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { navItems } from "@/components/layout/navItems";
import NavLink from "@/components/layout/NavLink";
import SidebarBackdrop from "@/components/layout/SidebarBackdrop";
import SidebarToggle from "@/components/layout/SidebarToggle";
import { clearToken } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function Sidebar() {
  const currentUser = useCurrentUser();
  const handleLogout = () => {
    clearToken(); // removes access_token + auth_user, notifies AuthGuard
    window.location.replace("/auth/login");
  };

  return (
    <>
      <SidebarBackdrop />
      <aside
        id="primary-sidebar"
        className="ob-sidebar"
        aria-label="Main sidebar"
      >
        <div className="ob-sidebar-brand">
          <Link
            href="/?tab=dashboard"
            className="ob-brand-link"
            title="Opus Bloc Admin"
          >
            <Image
              src="/Opus_bloc_logo.png"
              alt="Opus Bloc Logo"
              width={18}
              height={18}
              className="ob-brand-mark h-12 w-auto object-contain"
              priority
            />
            <span className="ob-brand-copy ob-sidebar-label">
              <span className="ob-brand-name">Opus Bloc</span>
              <span className="ob-brand-admin">Admin</span>
            </span>
          </Link>
          <SidebarToggle />
        </div>

        <nav className="ob-sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>

        <div className="ob-sidebar-user">
          <div className="ob-user-avatar" aria-hidden="true">
            OB
          </div>
          <div className="ob-user-copy ob-sidebar-label">
            <span className="ob-user-name">{currentUser.name ?? "Admin User"}</span>
            <span className="ob-user-role">{currentUser.role ?? "Administrator"}</span>
          </div>
          <button
            className="ob-logout"
            type="button"
            aria-label="Log out"
            title="Log out"
            onClick={handleLogout}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
}
