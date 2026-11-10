"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ChevronRight } from "lucide-react";

/** Small rounded label for IDs, numbers and names inside detail lists */
export function Chip({
  children,
  href,
}: {
  children: ReactNode;
  href?: string;
}) {
  const cls =
    "inline-flex max-w-full items-center rounded-md bg-chip px-2 py-0.5 text-xs text-body";
  return href ? (
    <Link
      href={href}
      className={clsx(
        cls,
        "underline-offset-2 hover:text-accent-text hover:underline",
      )}
    >
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export function ChipList({
  items,
  empty = "None",
}: {
  items: Array<{ key: string; label: ReactNode; href?: string }>;
  empty?: string;
}) {
  if (items.length === 0) return <span className="text-faint">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Chip key={item.key} href={item.href}>
          {item.label}
        </Chip>
      ))}
    </span>
  );
}

/* Counts route changes inside the app, so Back knows whether history has a page of ours */
let inAppNavigations = 0;
export const markInAppNavigation = () => {
  inAppNavigations += 1;
};

/**
 * Goes to the previous page; on a page opened directly, goes to `fallback` instead
 */
export function BackButton({ fallback }: { fallback?: string | null }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => setCanGoBack(inAppNavigations > 0), []);

  if (!canGoBack && !fallback) return null;
  return (
    <button
      type="button"
      onClick={() => (canGoBack ? router.back() : router.push(fallback!))}
      className="-ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-heading"
    >
      <ArrowLeft size={16} aria-hidden /> Back
    </button>
  );
}

/**
 * Back button plus breadcrumbs — the line above every page title.
 * Back falls back to the closest linked breadcrumb, else to `backHref`.
 */
export function PageTopBar({
  breadcrumbs,
  backHref,
}: {
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backHref?: string | null;
}) {
  const parent = breadcrumbs?.filter((b) => b.href).at(-1)?.href;
  const fallback =
    backHref === null ? null : (backHref ?? parent ?? "/dashboard");
  return (
    <div className="mb-3 flex min-h-8 flex-wrap items-center gap-x-3 gap-y-1 empty:hidden">
      <BackButton fallback={fallback} />
      {breadcrumbs && (
        <>
          <span aria-hidden className="h-4 w-px bg-hairline-strong" />
          <Breadcrumbs items={breadcrumbs} />
        </>
      )}
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight size={14} aria-hidden className="text-faint" />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="rounded px-0.5 hover:text-heading hover:underline underline-offset-2"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className="max-w-[16rem] truncate font-medium text-heading"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Active tab kept in `?tab=` so it survives reloads and can be linked to
 */
export function useTabParam<T extends string>(
  ids: readonly T[],
  fallback: T = ids[0],
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const active = (ids as readonly string[]).includes(raw ?? "")
    ? (raw as T)
    : fallback;
  const setActive = useCallback(
    (id: T) => router.replace(`${pathname}?tab=${id}`, { scroll: false }),
    [router, pathname],
  );
  return [active, setActive] as const;
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: ReadonlyArray<{
    id: T;
    label: string;
    icon?: React.ComponentType<{ size?: number }>;
    count?: number;
  }>;
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Arrow keys move between tabs, as the ARIA tabs pattern expects
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    onChange(next.id);
    refs.current[next.id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="no-scrollbar flex gap-1 overflow-x-auto border-b border-hairline"
    >
      {tabs.map(({ id, label: text, icon: Icon, count }, i) => {
        const selected = id === active;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={clsx(
              "-mb-px flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors",
              selected
                ? "border-accent text-accent-text"
                : "border-transparent text-muted hover:text-heading",
            )}
          >
            {Icon && <Icon size={16} />}
            {text}
            {count !== undefined && (
              <span className="tnum rounded-full bg-chip px-1.5 text-[11px] text-muted">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

