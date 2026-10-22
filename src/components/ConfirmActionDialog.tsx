"use client";

import { useEffect } from "react";
import { FiAlertTriangle } from "react-icons/fi";

/** A destructive action awaiting confirmation. `run` fires once confirmed. */
export type ConfirmAction = {
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  tone: "danger" | "primary";
  run: () => void | Promise<void>;
};

/**
 * In-app replacement for `window.confirm`. Escape and the backdrop both
 * cancel, and Cancel holds the initial focus, so a stray click or Enter can
 * never confirm. Render it when an action is pending and clear the action in
 * both callbacks.
 */
export default function ConfirmActionDialog({
  action,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const danger = action.tone === "danger";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-xl dark:border-[#2a3b4d] dark:bg-[#1a2632]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
              danger
                ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300"
                : "bg-[#eef6ff] text-[#2b8cee] dark:bg-[#0f2234]"
            }`}
          >
            <FiAlertTriangle className="text-[20px]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#111418] dark:text-white">
              {action.title}
            </h3>
            <p className="mt-1.5 text-sm text-[#617589] dark:text-gray-400">
              {action.message}
            </p>
            {action.detail && (
              <p className="mt-2 text-xs leading-5 text-[#617589] dark:text-gray-500">
                {action.detail}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e5e7eb] bg-[#f9fafb] px-5 py-3 dark:border-[#2a3b4d] dark:bg-[#101922]">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-lg border border-[#e5e7eb] bg-white px-4 py-2 text-sm font-semibold text-[#617589] transition hover:bg-gray-50 dark:border-[#2a3b4d] dark:bg-[#1a2632] dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#2b8cee] hover:bg-blue-600"
            }`}
          >
            {action.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
