"use client";

import { usePathname } from "next/navigation";

import { navItems } from "./navItems";

export default function Navbar() {
  const pathname = usePathname();
  const current = navItems.find((item) => pathname.startsWith(item.href));

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-hairline bg-surface px-6">
      <span className="text-sm font-medium text-muted">{current?.label}</span>
      <div className="h-8 w-8 rounded-full bg-chip" />
    </header>
  );
}
