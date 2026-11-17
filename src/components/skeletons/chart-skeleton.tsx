import { Skeleton } from "./skeleton";

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div aria-hidden="true" className={`${height} relative overflow-hidden rounded-lg border border-hairline bg-surface p-4`}>
      <div className="absolute inset-x-4 top-5 space-y-8"><Skeleton className="h-px w-full" /><Skeleton className="h-px w-full" /><Skeleton className="h-px w-full" /></div>
      <div className="absolute inset-x-5 bottom-5 flex h-3/4 items-end justify-around gap-3">
        {[38, 62, 47, 76, 54, 88, 43].map((height, index) => <Skeleton key={index} className="w-full max-w-10 rounded-t-md" height={`${height}%`} />)}
      </div>
    </div>
  );
}

export function DonutChartSkeleton() {
  return <div aria-hidden="true" className="flex min-h-60 items-center justify-center"><Skeleton className="h-44 w-44 rounded-full" /></div>;
}
