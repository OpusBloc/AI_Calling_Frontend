"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CircleAlert, Loader2, RotateCw } from "lucide-react";

import { Button } from "./controls";
import { humanize } from "./utils";

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

export const statusTone = (status: string): Tone =>
  STATUS_TONES[status.toLowerCase()] ?? "neutral";

/**
 * Status pill: a dot plus the label, so meaning never rests on colour alone
 */
export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const tone = statusTone(status);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
      )}
    >
      <span
        aria-hidden
        className={clsx("h-1.5 w-1.5 rounded-full", DOT_CLASS[tone])}
      />
      {label ?? humanize(status)}
    </span>
  );
}

export function ErrorBanner({
  message,
}: {
  message: string | null | undefined;
}) {
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
    <div
      role="alert"
      className="rounded-lg border border-loss/30 bg-loss-bg/50 px-6 py-10 text-center"
    >
      <CircleAlert size={22} aria-hidden className="mx-auto text-loss" />
      <p className="mt-2 text-sm font-semibold text-heading">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
        >
          <RotateCw size={14} aria-hidden /> Try again
        </Button>
      )}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-16 text-muted"
    >
      <Loader2 className="animate-spin" size={22} aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden className={clsx("skeleton block rounded", className)} />
  );
}

/**
 * Placeholder rows shown inside <Table> while data loads
 */
export function SkeletonRows({
  rows = 5,
  cols,
}: {
  rows?: number;
  cols: number;
}) {
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
      {action && (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      )}
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
    <section
      className={clsx(
        "overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-heading">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
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
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-bg text-accent-text"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="tnum mt-2 text-2xl font-semibold tracking-tight text-heading">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls =
    "block rounded-lg border border-hairline bg-surface p-4 shadow-sm";
  return href ? (
    <Link
      href={href}
      className={clsx(
        cls,
        "transition-colors hover:border-accent-strong hover:bg-raised",
      )}
    >
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
    <dl
      className={clsx(
        "grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
      )}
    >
      {items.map(({ label, value, wide }) => (
        <div
          key={label}
          className={clsx("min-w-0", wide && "sm:col-span-full")}
        >
          <dt className="text-xs font-medium uppercase tracking-[0.06em] text-muted">
            {label}
          </dt>
          <dd className="mt-1 break-words text-sm text-heading">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

