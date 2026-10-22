"use client";

import clsx from "clsx";
import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "./Button";

/** Shimmer placeholder. Prefer this over a blocking full-page spinner so the
 *  page's shape is visible while data loads. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx("animate-pulse rounded-md bg-surface-hover", className)}
    />
  );
}

/** Nothing to show, and that is fine — not an error. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-1 text-faint">{icon}</div> : null}
      <p className="text-sm font-semibold text-heading">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Something failed. Always say so — never leave a zeroed-out screen that looks
 *  like real data. */
export function ErrorState({
  title = "Could not load this",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-5 text-warn" strokeWidth={1.5} />
      <p className="text-sm font-semibold text-heading">{title}</p>
      {message ? (
        <p className="max-w-sm text-xs text-muted">{message}</p>
      ) : null}
      {onRetry ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={onRetry}
          className="mt-3"
          icon={<RotateCw className="size-3.5" strokeWidth={1.5} />}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
