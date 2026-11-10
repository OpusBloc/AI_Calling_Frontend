"use client";

import { isValidElement, type ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { IconButton } from "./controls";

/**
 * Right-edge slide-over panel for create/edit forms
 */
export function Drawer({
  title,
  description,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock page scroll and move focus into the panel; restore both on close
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      const first = panel.querySelector<HTMLElement>(
        "input:not([disabled]), select, textarea, button:not([aria-label='Close'])",
      );
      (first ?? panel).focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        aria-hidden
        onMouseDown={onClose}
        className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={clsx(
          "animate-slide-in-right absolute inset-y-0 right-0 flex w-full flex-col border-l border-hairline bg-surface shadow-lg outline-none",
          wide ? "max-w-2xl" : "max-w-md sm:max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-tight text-heading">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            )}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-hairline bg-raised px-6 py-4">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

export function Table({
  head,
  children,
  label,
  bare,
}: {
  head: ReactNode[];
  children: ReactNode;
  /** Accessible name for the table */
  label?: string;
  /** No outer border — for a table already inside a <Card flush> */
  bare?: boolean;
}) {
  return (
    <div
      className={clsx(
        "overflow-x-auto bg-surface",
        !bare && "rounded-lg border border-hairline shadow-sm",
      )}
    >
      <table className="w-full text-left text-sm" aria-label={label}>
        <thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted">
          <tr>
            {head.map((h, i) => {
              const ariaSort = isValidElement<{
                ariaSort?: "ascending" | "descending" | "none";
              }>(h)
                ? h.props.ariaSort
                : undefined;
              return (
                <th
                  key={i}
                  scope="col"
                  aria-sort={ariaSort}
                  className={clsx(
                    "whitespace-nowrap px-4 py-3 font-medium",
                    !h && "w-px",
                  )}
                >
                  {h || <span className="sr-only">Actions</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">{children}</tbody>
      </table>
    </div>
  );
}

/** Table row that opens a detail page on click and on Enter */
export function LinkRow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <tr
      tabIndex={0}
      onClick={(e) => {
        // Let buttons/links inside the row do their own thing
        if (
          (e.target as HTMLElement).closest("button, a, input, select, label")
        )
          return;
        router.push(href);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget)
          router.push(href);
      }}
      className={clsx(
        "cursor-pointer align-middle outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_3px_0_0_var(--accent)]",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/** A full-width message row inside a table body */
export function TableMessage({
  cols,
  children,
}: {
  cols: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
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
  const pages = new Set(
    [1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count),
  );
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) =>
    i > 0 && p - sorted[i - 1] > 1 ? ["…" as const, p] : [p],
  );
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

  const pageButton =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1 text-sm text-muted">
      <div className="flex items-center gap-3">
        <span className="tnum" aria-live="polite">
          {start + 1}–{end} of {total} {noun}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="sr-only sm:not-sr-only">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 cursor-pointer rounded-md border border-hairline bg-surface px-2 text-sm text-heading outline-none focus:border-accent"
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
            className={clsx(
              pageButton,
              "hover:bg-surface-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
            )}
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
                aria-label={`Page ${p}`}
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
            className={clsx(
              pageButton,
              "hover:bg-surface-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
            )}
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
