"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import clsx from "clsx";
import { CircleAlert, FileSpreadsheet, UploadCloud, X } from "lucide-react";

import { Button, IconButton } from "./controls";
import { EmptyState, ErrorBanner, ErrorState } from "./feedback";
import { errorMessage, humanize } from "./utils";
import { FormSkeleton, SkeletonBoundary } from "@/components/skeletons";

/**
 * What an edit page shows while its record loads, fails, or turns out not to exist
 */
export function EditLoadState({
  query,
  noun,
}: {
  query: {
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  noun: string;
}) {
  const notFound =
    query.isError && /not found/i.test(errorMessage(query.error));
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        {query.isLoading ? (
          <h1 className="text-2xl font-semibold tracking-tight text-heading sm:text-[28px]">Edit {noun}</h1>
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight text-heading sm:text-[28px]">
            {notFound ? `${humanize(noun)} not found` : `Edit ${noun}`}
          </h1>
        )}
      </div>
      <SkeletonBoundary loading={query.isLoading} skeleton={<FormSkeleton sections={2} />}>
      {notFound || !query.isError ? (
        <EmptyState
          title={`This ${noun} doesn't exist`}
          text="It may have been deleted, or the link is wrong."
        />
      ) : (
        <ErrorState
          message={errorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      )}
      </SkeletonBoundary>
    </div>
  );
}

/**
 * Full-page create/edit form with settings-style sections and a sticky action
 * bar so Save is always in reach on long forms.
 */
export function FormPage({
  title,
  description,
  headerLeading,
  children,
  footer,
  showHeaderActions = true,
  flushFooterToBottom = false,
  fullWidth = false,
  error,
}: {
  title: string;
  description?: string;
  headerLeading?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  showHeaderActions?: boolean;
  flushFooterToBottom?: boolean;
  fullWidth?: boolean;
  /** Form-level message shown above the sections, e.g. "fix the highlighted fields" */
  error?: string | null;
}) {
  return (
    <div className={clsx("mx-auto", fullWidth ? "w-full" : "max-w-5xl", flushFooterToBottom && "-mb-10")}>
      <div
        className={clsx(
          "flex flex-wrap items-end gap-4  pb-6",
          showHeaderActions && "justify-between",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          {headerLeading}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-heading sm:text-[28px]">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
            )}
          </div>
        </div>
        {showHeaderActions && (
          <div className="hidden items-center gap-2 md:flex ">{footer}</div>
        )}
      </div>
      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="divide-y divide-hairline">{children}</div>
      <div
        data-sticky-form-footer
        className={clsx(
          "sticky z-10 flex flex-wrap justify-end gap-2 border-t border-hairline bg-canvas/85 px-4 py-3 backdrop-blur-md -mx-4 sm:-mx-4 sm:px-4 lg:-mx-8 lg:px-0 lg:pl-10 lg:pr-10",
          flushFooterToBottom ? "bottom-[-20px]" : "bottom-0",
        )}
      >
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
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-5 rounded-lg border border-hairline bg-surface p-5 shadow-sm sm:p-6">
        {children}
      </div>
    </section>
  );
}

const formatBytes = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toFixed(1)} MB`;

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
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-bg text-accent-text"
          >
            <FileSpreadsheet size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-heading">
              {file.name}
            </p>
            <p className="text-xs text-muted">
              {formatBytes(file.size)}
              {details && <> · {details}</>}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
          >
            Replace
          </Button>
          <IconButton
            label="Remove file"
            tone="danger"
            onClick={() => onChange(null)}
          >
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
          <span
            aria-hidden
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-bg text-accent-text"
          >
            <UploadCloud size={22} />
          </span>
          <span className="text-sm font-medium text-heading">{label}</span>
          <span className="text-xs text-muted">
            Drag a file here, or click to browse
          </span>
        </button>
      )}
      {error ? (
        <p
          role="alert"
          className="mt-2 flex items-center gap-1 text-xs text-loss"
        >
          <CircleAlert size={13} aria-hidden /> {error}
        </p>
      ) : (
        hint && <p className="mt-2 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

