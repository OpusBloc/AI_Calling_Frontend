import { Skeleton } from "./skeleton";

export function ChartSkeleton({ height = "h-64", bare = false }: { height?: string; bare?: boolean }) {
  return (
    <div aria-hidden="true" className={`${height} relative overflow-hidden ${bare ? "" : "rounded-lg border border-hairline bg-surface p-4"}`}>
      <div className="absolute inset-x-4 top-5 space-y-8"><Skeleton className="h-px w-full" /><Skeleton className="h-px w-full" /><Skeleton className="h-px w-full" /></div>
      <div className="absolute inset-x-5 bottom-5 flex h-3/4 items-end justify-around gap-3">
        {[38, 62, 47, 76, 54, 88, 43].map((height, index) => <Skeleton key={index} className="w-full max-w-10 rounded-t-md" height={`${height}%`} />)}
      </div>
    </div>
  );
}

export function DonutChartSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-h-[280px] w-full items-center justify-center">
      <div className="relative aspect-[500/270] w-full overflow-hidden">
        <div className="absolute inset-x-0 top-[9.26%] h-[83.33%] overflow-hidden">
          <Skeleton className="absolute left-[5%] top-0 h-[200%] w-[90%] rounded-full" />
          <div className="absolute left-[26%] top-[46.67%] h-[106.67%] w-[48%] rounded-full bg-surface" />
        </div>
      </div>
    </div>
  );
}
