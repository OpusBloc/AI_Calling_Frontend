"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, ChevronLeft, ChevronRight, CircleAlert, FileSpreadsheet, Loader2, RotateCw, Search, UploadCloud, X } from "lucide-react";

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

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";

export const formatDay = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—";

/** "in_progress" → "In progress" */
export const humanize = (value: string) => value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/* -------------------------------- Controls -------------------------------- */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  /** Disables the button and shows a spinner in place of its icon */
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0",
        size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-accent text-on-accent shadow-sm hover:bg-accent-strong",
        variant === "secondary" &&
          "border border-hairline-strong bg-surface text-heading shadow-sm hover:bg-surface-hover",
        variant === "danger" && "bg-loss text-white shadow-sm hover:opacity-90",
        variant === "ghost" && "text-body hover:bg-surface-hover hover:text-heading",
        className,
      )}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  tone = "default",
  children,
  className,
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
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger"
          ? "text-muted hover:bg-loss-bg hover:text-loss"
          : "text-muted hover:bg-surface-hover hover:text-heading",
        className,
      )}
    >
      {children}
    </button>
  );
}

const inputClass =
  "w-full min-w-0 rounded-md border border-hairline-strong bg-surface-input px-3 text-sm text-heading outline-none transition-[border-color,box-shadow] placeholder:text-faint hover:border-accent-strong focus:border-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-loss";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  /** Shown under the field in place of the hint */
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-heading">
        {label}
        {required && (
          <span className="ml-0.5 text-loss" aria-hidden>
            *
          </span>
        )}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-loss">
          <CircleAlert size={13} aria-hidden /> {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

/** Wrapper that draws the travelling border light (see .glow-field in globals.css) */
export function GlowField({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={clsx("glow-field block", className)}>{children}</span>;
}

/** `className` sizes the field (width/max-width); the input fills it */
export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <GlowField className={className}>
      <input {...props} className={clsx(inputClass, "h-10")} />
    </GlowField>
  );
}

/** `className` styles the textarea itself (rows, font); it always fills the width */
export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <GlowField>
      <textarea {...props} className={clsx(inputClass, "block py-2 leading-relaxed", className)} />
    </GlowField>
  );
}

/** `className` sizes the field (width/max-width); the select fills it */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <GlowField className={className}>
      <select {...props} className={clsx(inputClass, "h-10 cursor-pointer")} />
    </GlowField>
  );
}

/* ---------------------------------- Phone --------------------------------- */

export const COUNTRY_CODE = "+91";

/** Any typed or pasted number → its 10 local digits ("+91 98123-45678" → "9812345678") */
export const toLocalNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("91") ? digits.slice(2, 12) : digits.slice(0, 10);
};

export const toE164 = (local: string) => `${COUNTRY_CODE}${local}`;

export const isValidLocalNumber = (local: string) => /^\d{10}$/.test(local);

/**
 * Phone field with a fixed +91 prefix. Holds just the 10 local digits; use toE164() to save.
 */
export function PhoneInput({
  value,
  onChange,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (local: string) => void;
}) {
  return (
    <GlowField className={className}>
      <div className="flex h-10 w-full min-w-0 overflow-hidden rounded-md border border-hairline-strong bg-surface-input transition-colors hover:border-accent-strong focus-within:border-accent has-[[aria-invalid=true]]:border-loss">
        <span className="tnum flex shrink-0 items-center border-r border-hairline-strong bg-raised px-3 text-sm font-medium text-body">
          {COUNTRY_CODE}
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          placeholder="98123 45678"
          {...props}
          value={value}
          onChange={(e) => onChange(toLocalNumber(e.target.value))}
          style={{ outline: "none" }}
          className="tnum min-w-0 flex-1 bg-transparent px-3 text-sm text-heading outline-none placeholder:text-faint focus-visible:outline-none"
        />
      </div>
    </GlowField>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name; defaults to the placeholder */
  label?: string;
  className?: string;
}) {
  return (
    <div className={clsx("glow-field relative", className)}>
      <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className={clsx(inputClass, "h-10 pl-9 pr-9")}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
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
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-hairline-strong",
      )}
    >
      <span
        className={clsx(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* -------------------------------- Feedback -------------------------------- */

export type Tone = "gain" | "info" | "warn" | "loss" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  gain: "bg-gain-bg text-gain",
  info: "bg-info-bg text-info",
  warn: "bg-warn-bg text-warn",
  loss: "bg-loss-bg text-loss",
  neutral: "bg-chip text-muted",
};

const DOT_CLASS: Record<Tone, string> = {
  gain: "bg-gain",
  info: "bg-info",
  warn: "bg-warn",
  loss: "bg-loss",
  neutral: "bg-faint",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Statuses used across campaigns, pools and calls, mapped to a tone */
const STATUS_TONES: Record<string, Tone> = {
  active: "gain",
  running: "gain",
  completed: "gain",
  connected: "gain",
  answered: "gain",
  in_progress: "info",
  scheduled: "info",
  queued: "info",
  pending: "info",
  dialing: "info",
  paused: "warn",
  retry: "warn",
  no_answer: "warn",
  busy: "warn",
  not_connected: "warn",
  draft: "neutral",
  inactive: "neutral",
  cancelled: "loss",
  failed: "loss",
  hung_up: "loss",
};

export const statusTone = (status: string): Tone => STATUS_TONES[status.toLowerCase()] ?? "neutral";

/**
 * Status pill: a dot plus the label, so meaning never rests on colour alone
 */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
      )}
    >
      <span aria-hidden className={clsx("h-1.5 w-1.5 rounded-full", DOT_CLASS[tone])} />
      {label ?? humanize(status)}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-loss/30 bg-loss-bg px-3 py-2 text-sm text-loss"
    >
      <CircleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Failed load: what went wrong and a way to try again
 */
export function ErrorState({
  title = "Couldn't load this",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-loss/30 bg-loss-bg/50 px-6 py-10 text-center">
      <CircleAlert size={22} aria-hidden className="mx-auto text-loss" />
      <p className="mt-2 text-sm font-semibold text-heading">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw size={14} aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted">
      <Loader2 className="animate-spin" size={22} aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={clsx("skeleton block rounded", className)} />;
}

/**
 * Placeholder rows shown inside <Table> while data loads
 */
export function SkeletonRows({ rows = 5, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton className={clsx("h-4", c === 0 ? "w-32" : "w-20")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-hairline-strong bg-surface px-6 py-14 text-center">
      {icon && (
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent-bg text-accent-text">
          {icon}
        </span>
      )}
      <p className="text-base font-semibold text-heading">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-heading">{title}</h2>
        <p className="mt-0.5 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * Bordered surface with an optional header row
 */
export function Card({
  title,
  description,
  actions,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** No body padding — for tables that run edge to edge */
  flush?: boolean;
}) {
  return (
    <section className={clsx("overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-heading">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={flush ? undefined : "p-5"}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && (
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-bg text-accent-text">
            {icon}
          </span>
        )}
      </div>
      <p className="tnum mt-2 text-2xl font-semibold tracking-tight text-heading">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "block rounded-lg border border-hairline bg-surface p-4 shadow-sm";
  return href ? (
    <Link href={href} className={clsx(cls, "transition-colors hover:border-accent-strong hover:bg-raised")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * Label/value grid for detail pages
 */
export function DetailList({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode; wide?: boolean }>;
  columns?: 2 | 3;
}) {
  return (
    <dl className={clsx("grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}>
      {items.map(({ label, value, wide }) => (
        <div key={label} className={clsx("min-w-0", wide && "sm:col-span-full")}>
          <dt className="text-xs font-medium uppercase tracking-[0.06em] text-muted">{label}</dt>
          <dd className="mt-1 break-words text-sm text-heading">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Small rounded label for IDs, numbers and names inside detail lists */
export function Chip({ children, href }: { children: ReactNode; href?: string }) {
  const cls = "inline-flex max-w-full items-center rounded-md bg-chip px-2 py-0.5 text-xs text-body";
  return href ? (
    <Link href={href} className={clsx(cls, "underline-offset-2 hover:text-accent-text hover:underline")}>
      {children}
    </Link>
  ) : (
    <span className={cls}>{children}</span>
  );
}

export function ChipList({ items, empty = "None" }: { items: Array<{ key: string; label: ReactNode; href?: string }>; empty?: string }) {
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
  const fallback = backHref === null ? null : (backHref ?? parent ?? "/dashboard");
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

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} aria-hidden className="text-faint" />}
            {item.href ? (
              <Link href={item.href} className="rounded px-0.5 hover:text-heading hover:underline underline-offset-2">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="max-w-[16rem] truncate font-medium text-heading">
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
export function useTabParam<T extends string>(ids: readonly T[], fallback: T = ids[0]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const active = (ids as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback;
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
  tabs: ReadonlyArray<{ id: T; label: string; icon?: React.ComponentType<{ size?: number }>; count?: number }>;
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
    <div role="tablist" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto border-b border-hairline">
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
              selected ? "border-accent text-accent-text" : "border-transparent text-muted hover:text-heading",
            )}
          >
            {Icon && <Icon size={16} />}
            {text}
            {count !== undefined && (
              <span className="tnum rounded-full bg-chip px-1.5 text-[11px] text-muted">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * What an edit page shows while its record loads, fails, or turns out not to exist
 */
export function EditLoadState({
  query,
  noun,
  breadcrumbs,
  backHref,
}: {
  query: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  noun: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
  backHref: string;
}) {
  const router = useRouter();
  const notFound = query.isError && /not found/i.test(errorMessage(query.error));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <PageTopBar breadcrumbs={breadcrumbs} />
        {query.isLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight text-heading sm:text-[28px]">
            {notFound ? `${humanize(noun)} not found` : `Edit ${noun}`}
          </h1>
        )}
      </div>
      {query.isLoading ? (
        <Loading label={`Loading ${noun}`} />
      ) : notFound || !query.isError ? (
        <EmptyState
          title={`This ${noun} doesn't exist`}
          text="It may have been deleted, or the link is wrong."
          action={<Button onClick={() => router.push(backHref)}>Go back</Button>}
        />
      ) : (
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      )}
    </div>
  );
}

/**
 * Full-page create/edit form. Header with the actions on top, settings-style
 * sections below (<FormSection>), and the actions repeated in a bar pinned to
 * the bottom of the screen so Save is always in reach on long forms.
 */
export function FormPage({
  breadcrumbs,
  title,
  description,
  children,
  footer,
  error,
}: {
  breadcrumbs: Array<{ label: string; href?: string }>;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  /** Form-level message shown above the sections, e.g. "fix the highlighted fields" */
  error?: string | null;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <PageTopBar breadcrumbs={breadcrumbs} />
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-heading sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        <div className="hidden items-center gap-2 md:flex">{footer}</div>
      </div>
      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="divide-y divide-hairline">{children}</div>
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap justify-end gap-2 border-t border-hairline bg-canvas/85 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {footer}
      </div>
    </div>
  );
}

/**
 * One block of a <FormPage>: what it's for on the left, its fields in a card on the right
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 py-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="text-base font-semibold text-heading">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="space-y-5 rounded-lg border border-hairline bg-surface p-5 shadow-sm sm:p-6">{children}</div>
    </section>
  );
}

const formatBytes = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/**
 * Drag-and-drop (or click) file picker that shows the chosen file
 */
export function FileDrop({
  file,
  onChange,
  accept,
  label,
  hint,
  error,
  details,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  /** e.g. ".csv,.xlsx" */
  accept: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Extra info about the chosen file, e.g. rows found */
  details?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onChange(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {file ? (
        <div
          className={clsx(
            "flex items-center gap-3 rounded-lg border bg-surface-input p-4",
            error ? "border-loss" : "border-hairline-strong",
          )}
        >
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-bg text-accent-text">
            <FileSpreadsheet size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-heading">{file.name}</p>
            <p className="text-xs text-muted">
              {formatBytes(file.size)}
              {details && <> · {details}</>}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <IconButton label="Remove file" tone="danger" onClick={() => onChange(null)}>
            <X size={16} />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onChange(e.dataTransfer.files?.[0] ?? null);
          }}
          className={clsx(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-accent bg-accent-bg"
              : error
                ? "border-loss/60 bg-loss-bg/40"
                : "border-hairline-strong bg-surface-input hover:border-accent-strong hover:bg-accent-bg/50",
          )}
        >
          <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-bg text-accent-text">
            <UploadCloud size={22} />
          </span>
          <span className="text-sm font-medium text-heading">{label}</span>
          <span className="text-xs text-muted">Drag a file here, or click to browse</span>
        </button>
      )}
      {error ? (
        <p role="alert" className="mt-2 flex items-center gap-1 text-xs text-loss">
          <CircleAlert size={13} aria-hidden /> {error}
        </p>
      ) : (
        hint && <p className="mt-2 text-xs text-muted">{hint}</p>
      )}
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
      const first = panel.querySelector<HTMLElement>("input:not([disabled]), select, textarea, button:not([aria-label='Close'])");
      (first ?? panel).focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
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
            <h3 className="text-lg font-semibold tracking-tight text-heading">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-hairline bg-raised px-6 py-4">{footer}</div>
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
  head: string[];
  children: ReactNode;
  /** Accessible name for the table */
  label?: string;
  /** No outer border — for a table already inside a <Card flush> */
  bare?: boolean;
}) {
  return (
    <div className={clsx("overflow-x-auto bg-surface", !bare && "rounded-lg border border-hairline shadow-sm")}>
      <table className="w-full text-left text-sm" aria-label={label}>
        <thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h || i} scope="col" className={clsx("whitespace-nowrap px-4 py-3 font-medium", !h && "w-px")}>
                {h || <span className="sr-only">Actions</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">{children}</tbody>
      </table>
    </div>
  );
}

/** Table row that opens a detail page on click and on Enter */
export function LinkRow({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <tr
      tabIndex={0}
      onClick={(e) => {
        // Let buttons/links inside the row do their own thing
        if ((e.target as HTMLElement).closest("button, a, input, select, label")) return;
        router.push(href);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) router.push(href);
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
export function TableMessage({ cols, children }: { cols: number; children: ReactNode }) {
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

  const pageButton = "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm transition-colors";

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
            className={clsx(pageButton, "hover:bg-surface-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent")}
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
            className={clsx(pageButton, "hover:bg-surface-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent")}
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
