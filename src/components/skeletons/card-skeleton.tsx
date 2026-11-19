import type { ReactNode } from "react";
import { Skeleton } from "./skeleton";

export function StatCardSkeleton({ compact = false, title = "", icon }: { compact?: boolean; title?: string; icon?: ReactNode }) {
  return (
    <article aria-hidden="true" className={compact ? "h-full min-h-[130px] rounded-2xl border border-hairline bg-surface p-3" : "h-[130px] rounded-2xl border border-hairline bg-surface px-3 py-3 shadow-sm"}>
      {compact ? (
        <div className="flex h-9 items-center gap-2.5 rounded-xl bg-raised px-3 text-sm font-medium text-muted">{icon}<span className="truncate">{title}</span></div>
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-heading">{icon}<span>{title}</span></div>
      )}
      <Skeleton className="mt-7 h-7 w-16 rounded-md" />
      <Skeleton className="mt-2 h-3 w-20 rounded" />
    </article>
  );
}

export function SummaryCardSkeleton() {
  return <div aria-hidden="true" className="rounded-lg border border-hairline bg-surface p-4"><Skeleton className="h-3.5 w-28 rounded" /><Skeleton className="mt-3 h-7 w-24 rounded" /><Skeleton className="mt-2 h-3 w-40 rounded" /></div>;
}

export function DashboardStatValueSkeleton() {
  return <div aria-hidden="true" className="space-y-1.5"><Skeleton className="h-7 w-14 rounded-md" /><Skeleton className="h-3 w-16 rounded-md" /></div>;
}

export function OverviewStatValueSkeleton() {
  return <div aria-hidden="true" className="space-y-2"><Skeleton className="h-7 w-20 rounded" /><Skeleton className="h-3 w-28 rounded" /></div>;
}
