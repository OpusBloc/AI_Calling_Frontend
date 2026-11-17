"use client";

import type { ReactNode } from "react";
import { useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

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

/* Tabs */

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

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta =
      e.key === "ArrowRight" ? 1 :
      e.key === "ArrowLeft" ? -1 : 0;

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
      className="no-scrollbar flex gap-2 overflow-x-auto border-b border-[var(--tabs-divider)]"
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
              "relative -mb-px flex h-10 items-center gap-2 whitespace-nowrap px-4 text-sm font-medium transition-colors  ",
              selected
                ? "tab-active text-link shadow-[inset_0_-2px_0_0] shadow-[var(--link-color)]"
                : "border-b-2 border-transparent text-[var(--tabs-inactive)]  hover:text-heading"
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

