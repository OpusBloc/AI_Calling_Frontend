"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CircleAlert, RotateCw } from "lucide-react";

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
  showRetryIcon = true,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetryIcon?: boolean;
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
          {showRetryIcon && <RotateCw size={14} aria-hidden />} Try again
        </Button>
      )}
    </div>
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
  leading,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-muted">{description}</p>
        </div>
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
  actionsClassName,
  children,
  className,
  flush,
  allowOverflow = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  children: ReactNode;
  className?: string;
  /** No body padding - for tables that run edge to edge */
  flush?: boolean;
  /** Allow menus and popovers inside the card to extend beyond its edges. */
  allowOverflow?: boolean;
}) {
  return (
    <section
      className={clsx(
        !allowOverflow && "overflow-hidden",
        "rounded-lg border border-hairline bg-surface shadow-sm",
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
            <div className={clsx("flex flex-wrap items-center gap-2", actionsClassName)}>{actions}</div>
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
  compact = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  href?: string;
  compact?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={clsx("min-w-0 font-medium text-muted", compact ? "truncate text-xs" : "text-sm")}>{label}</p>
        {icon && (
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-bg text-accent-text"
          >
            {icon}
          </span>
        )}
      </div>
      <div className={clsx("tnum mt-2 font-semibold tracking-tight text-heading", compact ? "mt-1 truncate whitespace-nowrap text-xl" : "text-2xl")}>
        {value}
      </div>
      {hint && <p className={clsx("mt-1 text-xs text-muted", compact && "truncate")}>{hint}</p>}
    </>
  );
  const cls =
    clsx("block rounded-lg border border-hairline bg-surface p-4 shadow-sm", compact && "min-w-0 p-3");
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
  mobileTwoColumns = false,
}: {
  items: Array<{ label: string; value: ReactNode; wide?: boolean }>;
  columns?: 2 | 3;
  mobileTwoColumns?: boolean;
}) {
  return (
    <dl
      className={clsx(
        clsx("grid gap-x-6 gap-y-5", mobileTwoColumns ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"),
        columns === 3 && "lg:grid-cols-3",
      )}
    >
      {items.map(({ label, value, wide }) => (
        <div
          key={label}
          className={clsx("min-w-0", wide && "col-span-full")}
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

