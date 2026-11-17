"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { navIcons, navItems } from "@/components/layout/navItems";
import type { NavIconName } from "@/components/layout/navItems";

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
  const searchParams = useSearchParams();
  const { closeMobile } = useSidebar();
  const section = navItems.find((item) => item.href === href);
  const active = section
    ? pathname === "/"
      ? (searchParams.get("tab") ?? "dashboard") === section.id
      : pathname === section.basePath || pathname.startsWith(`${section.basePath}/`)
    : false;
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
  const searchParams = useSearchParams();
  const current = pathname === "/"
    ? navItems.find((item) => item.id === (searchParams.get("tab") ?? "dashboard"))
    : navItems.find((item) => pathname === item.basePath || pathname.startsWith(`${item.basePath}/`));
  if (!current) return null;

  const Icon = navIcons[current.icon];
  return (
    <span className="ob-topbar-title">
      <Icon size={16} aria-hidden="true" />
      {current.label}
    </span>
  );
}
