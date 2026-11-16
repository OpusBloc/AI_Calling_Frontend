import { TableSkeleton } from "./table-skeleton";
import { CAMPAIGN_COLUMNS } from "./table-columns";
import { ChartSkeleton } from "./chart-skeleton";
import { StatCardSkeleton } from "./card-skeleton";
import { RouteSkeleton, Skeleton } from "./skeleton";
import Link from "next/link";
import { TableSkeletonShell } from "./table-skeleton";

export function CampaignsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return <TableSkeleton columns={CAMPAIGN_COLUMNS} rows={rows} />;
}

export function CampaignsRouteSkeleton() {
  return <RouteSkeleton><div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><input aria-label="Search campaigns" placeholder="Search campaigns" disabled className="h-10 w-full rounded-md border border-hairline-strong bg-surface-input px-3 text-sm sm:w-72" /><select aria-label="Filter by status" disabled className="h-10 w-full rounded-md border border-hairline-strong bg-surface-input px-3 text-sm sm:w-44"><option>All statuses</option></select><Link href="/campaigns/new" className="btn-blue-filled ml-auto inline-flex h-10 items-center rounded-md px-4 text-sm font-medium">New campaign</Link></div><TableSkeletonShell columns={CAMPAIGN_COLUMNS} rows={5} label="Campaigns" /></div></RouteSkeleton>;
}

export function CampaignDetailSkeleton() {
  const titles = ["Leads to call", "Calls made", "Answered", "Transferred", "Not reached", "Live right now", "Talk time", "Plivo billing", "AI cost", "Total campaign cost", "Running for"];
  return <RouteSkeleton><div className="space-y-6"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-8 w-64 rounded" /><Skeleton className="h-4 w-40 rounded" /></div><div className="flex gap-2"><Skeleton className="h-9 w-28 rounded-md" /><Skeleton className="h-9 w-28 rounded-md" /></div></div><div className="flex gap-2 border-b border-hairline pb-3">{["Overview", "Calls", "Costs", "Classification", "Settings"].map((label) => <span key={label} className="rounded-md px-3 py-2 text-sm text-muted">{label}</span>)}</div><div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">{titles.map((title) => <StatCardSkeleton key={title} compact title={title} />)}</div><div className="grid gap-4 xl:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div></div></RouteSkeleton>;
}

export function CampaignClassificationSkeleton() {
  return <div aria-hidden="true" className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>;
}

export function CallDetailsSkeleton() {
  return <div aria-hidden="true" className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}</div><Skeleton className="h-28 rounded-md" /><Skeleton className="h-40 rounded-md" /></div>;
}

export function DispatchStatsSkeleton() {
  return <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}</div>;
}
