"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

/**
 * Right-edge drawer used for every admin dialog.
 *
 * A drawer beats a centred box for these panels: the forms are long, a
 * full-height column needs no `max-h-[90vh]` scroll trap, and the list behind
 * stays visible so an admin can keep their place.
 *
 * Dismissal is handled here so no caller can forget a piece of it — backdrop
 * click, Escape, and a body scroll lock (without the lock the page behind
 * scrolls under the overlay on a trackpad). `busy` blocks dismissal while a
 * request is in flight, so a click outside cannot orphan a running save.
 *
 * It is portalled to <body>: rendered in place, a `position: fixed` overlay is
 * trapped by any ancestor with a transform / filter / backdrop-filter (e.g. a
 * sticky blurred sidebar) and ends up clipped or shifted up the page.
 */
export function SlideOver({
  onClose,
  busy = false,
  size = "max-w-lg",
  label,
  className,
  children,
}: {
  onClose: () => void;
  busy?: boolean;
  /** Tailwind max-width class for the panel. */
  size?: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [busy, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "flex h-full w-full flex-col overflow-y-auto border-l border-hairline bg-surface shadow-lg animate-slide-in-right",
          size,
          className,
        )}
      >
        {children}
      </aside>
    </div>,
    document.body,
  );
}
