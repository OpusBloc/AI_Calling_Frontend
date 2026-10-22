"use client";

import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";

import { Card } from "./Card";
import { Badge, type Tone } from "./Badge";
import { Skeleton } from "./States";

/**
 * KPI tile.
 *
 * Reading order is label → value → action: the number is the point, so nothing
 * decorative sits above it. The value is mono + tabular so a row of these
 * aligns digit-for-digit.
 *
 * `hint` renders only when there is something real to say. An earlier version
 * showed a green pill reading "-%" on every card, which looked like data but
 * was a placeholder.
 *
 * `emphasis` is the only thing that spends gold here — reserve it for the one
 * card that needs the admin to act. The design system keeps gold scarce, so
 * four gold tiles would make it meaningless.
 */
export function Stat({
  icon,
  label,
  value,
  hint,
  hintTone = "neutral",
  emphasis = false,
  onClick,
  actionLabel,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  hintTone?: Tone;
  emphasis?: boolean;
  onClick?: () => void;
  actionLabel?: string;
}) {
  const clickable = typeof onClick === "function";

  return (
    <Card
      interactive={clickable}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={
        clickable && actionLabel ? `${label}: ${value}. ${actionLabel}` : undefined
      }
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={clsx(
        "group flex h-full flex-col p-5",
        // A ring, not a border override — Card already sets `border-hairline`,
        // and Tailwind does no conflict resolution, so a second border-colour
        // utility would win or lose unpredictably.
        emphasis && "ring-1 ring-accent/30",
      )}
    >
      {/* label row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span
              className={clsx(
                "shrink-0 transition-colors",
                emphasis ? "text-accent" : "text-faint",
              )}
            >
              {icon}
            </span>
          ) : null}
          <span className="eyebrow truncate">{label}</span>
        </div>
        {hint ? (
          <Badge tone={hintTone} className="shrink-0">
            {hint}
          </Badge>
        ) : null}
      </div>

      {/* the number */}
      <p
        title={String(value)}
        className="tnum mt-3 truncate text-3xl leading-none font-semibold tracking-tight text-heading"
      >
        {value}
      </p>

      {/* action — always visible, so it also reads on touch, where there is no
          hover. Pinned to the bottom with mt-auto so every card in the row
          shares a baseline whether or not it has one. */}
      {clickable && actionLabel ? (
        <span className="mt-auto pt-4 inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors group-hover:text-accent-text group-focus-visible:text-accent-text">
          {actionLabel}
          <ArrowUpRight
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={1.5}
          />
        </span>
      ) : null}
    </Card>
  );
}

/** Loading placeholder that mirrors Stat's layout, so nothing jumps when the
 *  real value arrives. */
export function StatSkeleton() {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-auto h-3 w-20" />
    </Card>
  );
}
