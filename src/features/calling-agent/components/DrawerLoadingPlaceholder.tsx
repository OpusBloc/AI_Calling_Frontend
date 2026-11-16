import { Skeleton } from "@/components/skeletons/skeleton";

export default function DrawerLoadingPlaceholder() {
  return (
    <div aria-hidden="true" className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[var(--modal-backdrop)] backdrop-blur-[2px]" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-hairline bg-surface shadow-lg sm:max-w-lg">
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-6 py-5">
          <div className="w-full space-y-2">
            <Skeleton className="h-5 w-36 rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {[0, 1, 2].map((field) => (
            <div key={field} className="space-y-2">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-hairline bg-raised px-6 py-4">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </aside>
    </div>
  );
}
