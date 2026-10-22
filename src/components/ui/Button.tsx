"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

/**
 * Gold is the scarcest thing in this design system — keep to ONE `primary`
 * button per view. Everything else is `secondary` or `ghost`.
 */
const VARIANTS: Record<Variant, string> = {
  /* `.gold-gradient` (globals.css) supplies the champagne gradient, pins the
     label and any icon to black in both themes, and adds the hover glow — so
     every primary button in the app matches the gradient tabs. */
  primary: "gold-gradient border border-transparent",
  secondary:
    "bg-surface text-heading border border-hairline-strong hover:bg-surface-hover",
  ghost:
    "bg-transparent text-body border border-transparent hover:bg-surface-hover hover:text-heading",
  danger:
    "bg-transparent text-loss border border-loss/40 hover:bg-loss-bg hover:border-loss",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-xs gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  align = "center",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** `start` left-aligns label + icon — for full-width buttons such as the
   *  sidebar footer. A `justify-*` class passed via `className` would lose to
   *  the base `justify-center`, since Tailwind does no conflict resolution. */
  align?: "center" | "start";
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center rounded-md font-semibold",
        align === "start" ? "justify-start" : "justify-center",
        "transition-all duration-200 ease-[var(--ease-out)]",
        "active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
