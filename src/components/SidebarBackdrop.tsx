"use client";

import { useSidebar } from "@/context/SidebarContext";

export default function SidebarBackdrop() {
  const { overlayOpen, closeMobile } = useSidebar();
  if (!overlayOpen) return null;

  return (
    <button
      type="button"
      className="ob-sidebar-backdrop"
      aria-label="Close sidebar"
      onClick={closeMobile}
    />
  );
}
