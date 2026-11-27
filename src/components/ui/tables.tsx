"use client";

import { Children, Fragment, isValidElement, type ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { IconButton } from "./controls";
import type { TableColumnConfig } from "@/components/skeletons/table-columns";
import { SkeletonBoundary } from "@/components/skeletons/skeleton";
import { AccordionList } from "@/components/AccordionList";
import type { AccordionAction, AccordionItemConfig } from "@/components/AccordionItem";

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
  full,
  offsetSidebar,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  full?: boolean;
  offsetSidebar?: boolean;
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
      className={clsx("fixed inset-0 z-50", offsetSidebar && "ob-drawer-offset-sidebar z-[102]")}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        aria-hidden
        onMouseDown={onClose}
        className="animate-fade-in absolute inset-0 bg-[var(--modal-backdrop)] backdrop-blur-[2px]"
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={clsx(
          "animate-slide-in-right absolute inset-y-0 right-0 flex w-full flex-col border-l border-hairline bg-surface shadow-lg outline-none",
          full ? "max-w-none" : wide ? "max-w-2xl" : "max-w-md sm:max-w-lg",
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
  className,
  columns,
  loading = false,
  skeleton,
  mobileItems,
  mobileEmpty,
  headClassNames,
  columnClassNames,
  mobileListDense = false,
  mobileChevronLast = false,
}: {
  head: ReactNode[];
  children?: ReactNode;
  /** Accessible name for the table */
  label?: string;
  /** No outer border - for a table already inside a <Card flush> */
  bare?: boolean;
  className?: string;
  columns?: TableColumnConfig[];
  loading?: boolean;
  skeleton?: ReactNode;
  mobileItems?: AccordionItemConfig[];
  mobileEmpty?: ReactNode;
  headClassNames?: string[];
  columnClassNames?: string[];
  mobileListDense?: boolean;
  mobileChevronLast?: boolean;
}) {
  const items = mobileItems ?? buildAccordionItems(children, head);
  const accordion = mobileChevronLast ? items.map((item) => ({ ...item, chevronLast: true })) : items;
  const emptyContent = mobileEmpty ?? findEmptyContent(children);
  return (
    <div
      className={clsx(
        "mobile-table-list no-scrollbar bg-surface md:overflow-x-auto",
        !bare && "md:rounded-lg md:border md:border-hairline md:shadow-sm",
        className,
      )}
    >
      <AccordionList items={accordion} empty={emptyContent} loading={loading} dense={mobileListDense} />
      <table className="hidden w-full text-left text-sm md:table" aria-label={label}>
        {columns && <colgroup>{columns.map((column, index) => <col key={column.label || `actions-${index}`} className={columnClassNames?.[index]} style={{ width: column.width }} />)}</colgroup>}
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
                    headClassNames?.[i],
                  )}
                >
                  {h || <span className="sr-only">Actions</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <SkeletonBoundary
          as="tbody"
          className="divide-y divide-hairline"
          loading={loading}
          skeleton={skeleton}
          announcement={<tr className="sr-only"><td colSpan={head.length}>Loading…</td></tr>}
        >
          {children}
        </SkeletonBoundary>
      </table>
    </div>
  );
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ").trim();
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function findEmptyContent(children: ReactNode): ReactNode {
  let empty: ReactNode;
  Children.forEach(children, (child) => {
    if (isValidElement<{ children?: ReactNode }>(child)) {
      if (child.type === TableMessage) empty = child.props.children;
      else if (child.type === LinkRow || child.type === Fragment) {
        const nested = findEmptyContent(child.props.children);
        if (nested) empty = nested;
      }
    }
  });
  return empty;
}

function buildAccordionItems(children: ReactNode, headings: ReactNode[]): AccordionItemConfig[] {
  const rows: { cells: ReactNode[]; href?: string }[] = [];
  const collect = (content: ReactNode) => Children.forEach(content, (child) => {
    if (!isValidElement<{ children?: ReactNode; href?: string }>(child)) return;
    if (child.type === Fragment) {
      collect(child.props.children);
      return;
    }
    if (child.type === LinkRow) {
      const cells: ReactNode[] = [];
      Children.forEach(child.props.children, (cell) => {
        if (isValidElement<{ children?: ReactNode }>(cell) && cell.type === "td") cells.push(cell.props.children);
      });
      if (cells.length) rows.push({ cells, href: child.props.href });
      return;
    }
    if (child.type === "tr") {
      const cells: ReactNode[] = [];
      Children.forEach(child.props.children, (cell) => {
        if (isValidElement<{ children?: ReactNode }>(cell) && cell.type === "td") cells.push(cell.props.children);
      });
      if (cells.length) rows.push({ cells, href: child.props.href });
    }
  });
  collect(children);

  return rows.map(({ cells, href }, rowIndex) => {
    const title = textOf(cells[0]) || "Item";
    const subtitleIndex = headings.findIndex((heading, index) => index > 0 && /email|phone|date|updated|created|when/i.test(textOf(heading)));
    const statusIndex = headings.findIndex((heading) => /status/i.test(textOf(heading)));
    const keyIndex = headings.findIndex((heading, index) => index > 0 && /calls|total|cost|count|numbers|concurrency/i.test(textOf(heading)));
    const subtitle = subtitleIndex >= 0 ? cells[subtitleIndex] : undefined;
    const badge = statusIndex >= 0 ? cells[statusIndex] : undefined;
    const details = cells.slice(1).flatMap((value, index) => {
      const cellIndex = index + 1;
      const label = textOf(headings[cellIndex]) || `Detail ${cellIndex}`;
      if (/^actions?$/i.test(label) || !textOf(headings[cellIndex]).trim()) return [];
      const valueText = textOf(value);
      if (/^status$/i.test(label)) return [];
      return [{ label, value, fullWidth: valueText.length > 42 || /description|prompt|response/i.test(label) }];
    });
    const actions: AccordionAction[] = [];
    if (href) actions.push({ label: "View details", href });
    collectRowActions(cells[cells.length - 1], actions);
    actions.sort((a, b) => actionOrder(a.label) - actionOrder(b.label));
    return {
      id: `${rowIndex}-${title}`,
      avatar: title.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
      title,
      subtitle,
      badge,
      keyValue: keyIndex >= 0 ? { label: textOf(headings[keyIndex]), value: cells[keyIndex] } : undefined,
      details,
      actions,
    };
  });
}

function collectRowActions(node: ReactNode, actions: AccordionAction[]) {
  Children.forEach(node, (child) => {
    if (!isValidElement<{ children?: ReactNode; label?: string; onClick?: () => void; href?: string; disabled?: boolean; title?: string; "aria-label"?: string }>(child)) return;
    const props = child.props;
    const rawLabel = props.label ?? props["aria-label"] ?? props.title;
    const componentName = typeof child.type === "function" ? child.type.name : "";
    if (componentName === "DeleteIconButton" && props.onClick && !actions.some((action) => action.label === "Delete")) {
      actions.push({ label: "Delete", onClick: props.onClick, danger: true, disabled: props.disabled });
    }
    if (props.href && typeof rawLabel === "string") actions.push({ label: rawLabel, href: props.href });
    else if (props.onClick && typeof rawLabel === "string") {
      const label = /delete|remove/i.test(rawLabel) ? "Delete" : /edit/i.test(rawLabel) ? "Edit" : rawLabel;
      if (!actions.some((action) => action.label === label)) actions.push({ label, onClick: props.onClick, danger: label === "Delete", disabled: props.disabled });
    }
    collectRowActions(props.children, actions);
  });
}

function actionOrder(label: string) {
  return label === "View details" ? 0 : /^edit/i.test(label) ? 1 : /^delete/i.test(label) ? 2 : 3;
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
  if (count <= 5) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set(
    page <= 3
      ? [1, 2, 3, 4, count]
      : page >= count - 2
        ? [1, count - 3, count - 2, count - 1, count]
        : [1, page - 1, page, page + 1, count],
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
  mobileCompact = false,
}: ReturnType<typeof usePagination<unknown>> & { noun?: string; mobileCompact?: boolean }) {
  if (total === 0) return null;
  const end = Math.min(start + pageSize, total);
  const pageSizes = [...new Set([pageSize, ...PAGE_SIZES])].sort((a, b) => a - b);

  const pageButton =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm transition-colors";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1 text-sm text-muted">
      {mobileCompact && (
        <div className="w-full sm:hidden">
          <p className="tnum" aria-live="polite">
            Showing {start + 1}-{end} of {total} {noun}
          </p>
          {pageCount > 1 && (
            <nav aria-label="Pagination" className="mt-2 flex w-full items-center gap-2">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="btn-blue-filled inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-md px-2 text-sm hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="whitespace-nowrap text-center font-medium text-heading" aria-live="polite">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                aria-label="Next page"
                disabled={page === pageCount}
                onClick={() => setPage(page + 1)}
                className="btn-blue-filled inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-md px-2 text-sm hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </div>
      )}
      <div className={clsx("items-center gap-3", mobileCompact ? "hidden sm:flex" : "flex")}>
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
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      {pageCount > 1 && (
        <nav aria-label="Pagination" className={clsx("items-center gap-1", mobileCompact ? "hidden sm:flex" : "flex")}>
          <button
            type="button"
            aria-label="Previous page"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className={clsx(
              pageButton,
              "btn-blue-filled hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40",
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
              "btn-blue-filled hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
