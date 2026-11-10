import Link from "next/link";
import { LogOut } from "lucide-react";

import { navItems } from "@/components/navItems";
import NavLink from "@/components/NavLink";
import SidebarBackdrop from "@/components/SidebarBackdrop";
import SidebarToggle from "@/components/SidebarToggle";

export default function Sidebar() {
  return (
    <>
      <SidebarBackdrop />
      <aside id="primary-sidebar" className="ob-sidebar" aria-label="Main sidebar">
        <div className="ob-sidebar-brand">
          <Link href="/dashboard" className="ob-brand-link" title="Opus Bloc Admin">
            <span className="ob-brand-mark" aria-hidden="true">OB</span>
            <span className="ob-brand-copy ob-sidebar-label">
              <span className="ob-brand-name">Opus Bloc</span>
              <span className="ob-brand-admin">Admin</span>
            </span>
          </Link>
          <SidebarToggle />
        </div>

        <nav className="ob-sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>

        <div className="ob-sidebar-user">
          <div className="ob-user-avatar" aria-hidden="true">OB</div>
          <div className="ob-user-copy ob-sidebar-label">
            <span className="ob-user-name">Admin User</span>
            <span className="ob-user-role">Administrator</span>
          </div>
          <button className="ob-logout" type="button" aria-label="Log out" title="Log out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
}
