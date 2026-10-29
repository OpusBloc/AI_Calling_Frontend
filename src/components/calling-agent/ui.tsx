"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";

/* --------------------------------- Data ---------------------------------- */

/**
 * Load data on mount and expose a `reload` for after mutations
 */
export function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loader());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong.";

export const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

/* -------------------------------- Controls -------------------------------- */

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-on-accent shadow-sm hover:bg-accent-strong",
        variant === "secondary" &&
          "border border-hairline-strong bg-surface text-heading shadow-sm hover:bg-surface-hover",
        variant === "danger" && "bg-loss text-white hover:opacity-90",
        variant === "ghost" && "text-body hover:bg-surface-hover",
        className,
      )}
    />
  );
}

export function IconButton({
  label,
  tone = "default",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      {...props}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-50",
        tone === "danger" ? "text-loss hover:bg-loss-bg" : "text-muted hover:bg-surface-hover hover:text-heading",
      )}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full rounded-md border border-hairline bg-surface-input px-3 text-sm text-heading outline-none transition-[border-color,box-shadow] placeholder:text-faint hover:border-hairline-strong focus:border-accent focus:shadow-[0_0_0_3px_var(--focus-ring)]";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-heading">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputClass, "h-10", props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(inputClass, "py-2 leading-relaxed", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(inputClass, "h-10", props.className)} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-accent" : "bg-hairline-strong",
      )}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* -------------------------------- Feedback -------------------------------- */

export function Badge({ tone, children }: { tone: "gain" | "neutral"; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "gain" ? "bg-gain-bg text-gain" : "bg-chip text-muted",
      )}
    >
      {children}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-loss/30 bg-loss-bg px-3 py-2 text-sm text-loss">{message}</p>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center py-16 text-muted">
      <Loader2 className="animate-spin" size={22} />
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-hairline-strong bg-surface px-6 py-14 text-center">
      <p className="text-base font-semibold text-heading">{title}</p>
      <p className="mt-1 text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* --------------------------------- Layout --------------------------------- */

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-heading">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * Right-edge slide-over panel for create/edit forms
 */
export function Drawer({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        aria-hidden
        onMouseDown={onClose}
        className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <aside className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-hairline bg-surface shadow-lg sm:max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-heading">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-hairline bg-raised px-6 py-4">{footer}</div>
      </aside>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h || i} className={clsx("px-4 py-3 font-medium", !h && "w-px")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">{children}</tbody>
      </table>
    </div>
  );
}

/* ------------------------------- Pagination ------------------------------- */

export const PAGE_SIZES = [10, 25, 50];

/**
 * Client-side paging (the backend list endpoints return everything at once)
 */
export function usePagination<T>(items: T[], initialSize = PAGE_SIZES[0]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // Stay in range when items are deleted or the page size grows
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    page: current,
    pageCount,
    pageSize,
    total: items.length,
    start,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}

/** Page numbers to show, with "…" gaps: 1 … 4 5 6 … 12 */
const pageList = (page: number, count: number): (number | "…")[] => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["…" as const, p] : [p]));
};

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  start,
  setPage,
  setPageSize,
  noun = "items",
}: ReturnType<typeof usePagination<unknown>> & { noun?: string }) {
  if (total === 0) return null;
  const end = Math.min(start + pageSize, total);

  const pageButton = "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1 text-sm text-muted">
      <div className="flex items-center gap-3">
        <span className="tnum">
          {start + 1}–{end} of {total} {noun}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="sr-only sm:not-sr-only">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded-md border border-hairline bg-surface px-2 text-sm text-heading outline-none focus:border-accent"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className={clsx(pageButton, "hover:bg-surface-hover hover:text-heading disabled:opacity-40 disabled:hover:bg-transparent")}
          >
            <ChevronLeft size={16} />
          </button>
          {pageList(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-faint">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? "page" : undefined}
                onClick={() => setPage(p)}
                className={clsx(
                  pageButton,
                  "tnum",
                  p === page
                    ? "bg-accent font-semibold text-on-accent"
                    : "hover:bg-surface-hover hover:text-heading",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            aria-label="Next page"
            disabled={page === pageCount}
            onClick={() => setPage(page + 1)}
            className={clsx(pageButton, "hover:bg-surface-hover hover:text-heading disabled:opacity-40 disabled:hover:bg-transparent")}
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
