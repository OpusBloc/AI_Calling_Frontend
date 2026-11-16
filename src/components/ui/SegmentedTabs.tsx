"use client";

import clsx from "clsx";
import { Check } from "lucide-react";

export type SegmentedTabItem = {
  id: string;
  label: string;
  done?: boolean;
  optional?: boolean;
};

type Props = {
  items: SegmentedTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
};

export default function SegmentedTabs({
  items,
  activeId,
  onChange,
  className,
  ariaLabel,
}: Props) {
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={clsx("flex gap-2 overflow-x-auto pb-1", className)}
    >
      {items.map((item, i) => {
        const active = i === activeIndex;
        const filled = i <= activeIndex || item.done;

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className="group flex min-w-[96px] flex-1 flex-col gap-2 text-left"
          >
            {/* Dash segment */}
            <span
              className={clsx(
                "h-1.5 w-full rounded-full transition-colors duration-200",
                filled
                  ? "bg-primary"
                  : "bg-[var(--primary-tint)] group-hover:bg-[var(--primary-tint)]",
              )}
            />

            {/* Label */}
            <span
              className={clsx(
                "flex items-center gap-1.5 whitespace-nowrap text-sm transition-colors",
                active
                  ? "font-semibold text-link"
                  : "font-medium text-muted group-hover:text-heading",
              )}
            >
              {item.done && !active && (
                <Check size={13} strokeWidth={3} className="text-gain" aria-hidden />
              )}
              {item.label}
              {item.optional && (
                <span className="text-xs font-normal text-faint">optional</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
