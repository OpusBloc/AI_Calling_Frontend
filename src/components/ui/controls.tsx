"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { CircleAlert, Loader2, Search, X } from "lucide-react";

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
        variant === "primary" &&
          "bg-accent text-on-accent shadow-sm hover:bg-accent-strong",
        variant === "secondary" &&
          "bg-accent text-on-accent shadow-sm hover:bg-accent-strong",
        variant === "danger" && "bg-loss text-white shadow-sm hover:opacity-90",
        variant === "ghost" &&
          "bg-accent text-on-accent shadow-sm hover:bg-accent-strong",
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
        <span
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-xs text-loss"
        >
          <CircleAlert size={13} aria-hidden /> {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

/** Wrapper that draws the travelling border light (see .glow-field in globals.css) */
export function GlowField({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={clsx("glow-field block", className)}>{children}</span>
  );
}

/** `className` sizes the field (width/max-width); the input fills it */
export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <GlowField className={className}>
      <input {...props} className={clsx(inputClass, "h-10")} />
    </GlowField>
  );
}

/** `className` styles the textarea itself (rows, font); it always fills the width */
export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <GlowField>
      <textarea
        {...props}
        className={clsx(inputClass, "block py-2 leading-relaxed", className)}
      />
    </GlowField>
  );
}

/** `className` sizes the field (width/max-width); the select fills it */
export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
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
  return digits.length > 10 && digits.startsWith("91")
    ? digits.slice(2, 12)
    : digits.slice(0, 10);
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
      <Search
        size={16}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
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

