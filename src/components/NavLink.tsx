"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { navIcons, navItems } from "@/components/navItems";
import type { NavIconName } from "@/components/navItems";

export default function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: NavIconName;
}) {
  const pathname = usePathname();
  const { closeMobile } = useSidebar();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = navIcons[icon];

  return (
    <Link
      href={href}
      className={`ob-nav-link${active ? " is-active" : ""}`}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      title={label}
      onClick={closeMobile}
    >
      <Icon className="ob-nav-icon" size={20} aria-hidden="true" />
      <span className="ob-sidebar-label">{label}</span>
    </Link>
  );
}

export function CurrentPageTitle() {
  const pathname = usePathname();
  const current = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  if (!current) return null;

  const Icon = navIcons[current.icon];
  return (
    <span className="ob-topbar-title">
      <Icon size={16} aria-hidden="true" />
      {current.label}
    </span>
  );
}
