import { FormSkeleton } from "./form-skeleton";
import { RouteSkeleton, Skeleton } from "./skeleton";
import { TableSkeletonShell } from "./table-skeleton";
import { POOL_COLUMNS } from "./table-columns";

export function NumberPoolSkeleton() {
  return <RouteSkeleton><div className="space-y-4"><div><h2 className="text-lg font-semibold text-heading">Plivo pools</h2><p className="mt-1 text-sm text-muted">Groups of Plivo numbers that campaigns call from.</p></div><input aria-label="Search pools or numbers" placeholder="Search pools or numbers" disabled className="h-10 w-full rounded-md border border-hairline-strong bg-surface-input px-3 text-sm sm:w-72" /><TableSkeletonShell columns={POOL_COLUMNS} rows={5} label="Plivo pools" /></div></RouteSkeleton>;
}

export function PoolDetailSkeleton() {
  return (
    <RouteSkeleton>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-56 rounded" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{["Numbers", "Concurrency limit", "Used by campaigns"].map((label) => <div key={label} className="rounded-lg border border-hairline bg-surface p-4"><p className="text-xs text-muted">{label}</p><Skeleton className="mt-3 h-7 w-16 rounded" /></div>)}</div>
        <section className="rounded-lg border border-hairline bg-surface"><h2 className="border-b border-hairline p-4 text-sm font-semibold text-heading">Numbers</h2><Skeleton className="m-4 h-64 rounded-lg" /></section>
      </div>
    </RouteSkeleton>
  );
}

export function PoolFormSkeleton({ title = "New Plivo pool" }: { title?: string }) {
  return <RouteSkeleton><div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-semibold text-heading">{title}</h1><FormSkeleton sections={2} /></div></RouteSkeleton>;
}

export function PoolNumberCountSkeleton() {
  return <Skeleton className="h-4 w-10 rounded" />;
}
