"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import clsx from "clsx";
import { CircleAlert, TriangleAlert } from "lucide-react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions like delete */
  tone?: "danger" | "warning";
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

/* Single global dialog: `confirmDialog()` opens it, <ConfirmHost /> renders it */
let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * In-app replacement for window.confirm — resolves true when confirmed
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  pending?.resolve(false);
  return new Promise((resolve) => {
    pending = { ...options, resolve };
    emit();
  });
}

const close = (ok: boolean) => {
  pending?.resolve(ok);
  pending = null;
  emit();
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function ConfirmHost() {
  const current = useSyncExternalStore(subscribe, () => pending, () => null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!current) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  if (!current) return null;
  const danger = (current.tone ?? "danger") === "danger";
  const Icon = danger ? TriangleAlert : CircleAlert;

  return (
    // Above the drawer (z-50) so confirmations raised from inside it are visible
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-label={current.title}>
      <div aria-hidden onMouseDown={() => close(false)} className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="animate-fade-in relative w-full max-w-md rounded-lg border border-hairline bg-surface p-6 shadow-lg">
        <div className="flex gap-4">
          <span
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              danger ? "bg-loss-bg text-loss" : "bg-chip text-warn",
            )}
          >
            <Icon size={20} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-heading">{current.title}</h3>
            <p className="mt-1 text-sm text-muted">{current.message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            className="inline-flex h-9 items-center rounded-md border border-hairline-strong bg-surface px-3 text-sm font-medium text-heading shadow-sm hover:bg-surface-hover"
          >
            {current.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => close(true)}
            className={clsx(
              "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium",
              danger ? "bg-loss text-white hover:opacity-90" : "bg-accent text-on-accent hover:bg-accent-strong",
            )}
          >
            {current.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
