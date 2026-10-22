"use client";

import { X } from "lucide-react";

/**
 * One applied filter, removable on its own.
 *
 * A filter count alone ("Filters 3") tells an admin that something is narrowing
 * the list but not what, and forces them back into the panel to find out. Chips
 * make the applied set readable at a glance and removable one at a time.
 */
export function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-bg py-1 pl-3 pr-1.5 text-xs font-semibold text-accent-text">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="grid size-4 place-items-center rounded-full transition-colors hover:bg-accent hover:text-on-accent"
      >
        <X className="size-3" strokeWidth={2} />
      </button>
    </span>
  );
}
