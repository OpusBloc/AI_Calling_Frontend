import { Skeleton } from "./skeleton";

export function SidebarProfileSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 p-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5"><Skeleton className="h-3.5 w-24 rounded" /><Skeleton className="h-3 w-16 rounded" /></div>
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );
}
