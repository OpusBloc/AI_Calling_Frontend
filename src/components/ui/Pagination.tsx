"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "./Button";

/**
 * Range summary + prev/next. This pattern was hand-rolled in 11 files with
 * inconsistent wording and formatting; use this instead.
 *
 * Counts are mono + tabular so the summary does not reflow as pages change.
 */
export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  note,
  noun = "results",
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Extra context, e.g. "across all users" while a filter is applied. */
  note?: string;
  noun?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>
        {total === 0 ? (
          `No ${noun}`
        ) : (
          <>
            Showing <span className="tnum text-heading">{from}</span>–
            <span className="tnum text-heading">{to}</span> of{" "}
            <span className="tnum text-heading">
              {total.toLocaleString("en-IN")}
            </span>{" "}
            {noun}
          </>
        )}
        {note ? <span className="ml-1.5 text-xs text-faint">({note})</span> : null}
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          icon={<ChevronLeft className="size-3.5" strokeWidth={1.5} />}
        >
          Previous
        </Button>
        <span className="tnum px-1 text-xs text-muted">
          {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
