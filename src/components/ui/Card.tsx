"use client";

import clsx from "clsx";

/**
 * The design system's signature surface: a hairline gold border, architectural
 * 16px radius, and the "lit edge" — a 1px inset highlight along the top, as if
 * light were catching the edge. Used for every panel in the admin.
 */
export function Card({
  className,
  interactive = false,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-hairline bg-surface shadow-sm",
        "shadow-[inset_0_1px_0_var(--inner-lit)]",
        interactive &&
          "cursor-pointer transition-colors duration-200 hover:border-hairline-strong hover:bg-surface-hover",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Card header: title on the left, actions (filters, links) on the right. */
export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-start justify-between gap-4 px-5 pt-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold tracking-tight text-heading">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
