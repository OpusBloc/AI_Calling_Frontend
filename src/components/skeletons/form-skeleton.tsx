import { Skeleton } from "./skeleton";

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div aria-hidden="true" className="space-y-5">
      {Array.from({ length: sections }, (_, section) => (
        <section key={section} className="space-y-4 rounded-lg border border-hairline bg-surface p-4 sm:p-5">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-3 w-56 max-w-full rounded" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Skeleton className="h-3 w-24 rounded" /><Skeleton className="h-10 w-full rounded-md" /></div>
            <div className="space-y-2"><Skeleton className="h-3 w-28 rounded" /><Skeleton className="h-10 w-full rounded-md" /></div>
          </div>
        </section>
      ))}
    </div>
  );
}

export function MultiSelectOptionsSkeleton() {
  return <div aria-hidden="true" className="space-y-1">{["w-4/5", "w-2/3", "w-3/4"].map((width, i) => <div key={i} className="flex min-h-10 items-center gap-2.5 rounded px-2"><Skeleton className="h-4 w-4 rounded" /><Skeleton className={`h-3.5 ${width} rounded`} /></div>)}</div>;
}

export function ActionProgressSkeleton() {
  return <Skeleton className="h-4 w-4 shrink-0 rounded-full" />;
}

export function FieldControlSkeleton() {
  return <Skeleton className="h-10 w-full rounded-md" />;
}

export function TemplateOptionsSkeleton() {
  return <div aria-hidden="true" className="space-y-1">{["w-4/5", "w-2/3", "w-3/4"].map((width, i) => <div key={i} className="flex min-h-12 items-center gap-2.5 rounded px-2.5"><Skeleton className="h-4 w-4 shrink-0 rounded" /><div className="min-w-0 flex-1 space-y-1.5"><Skeleton className={`h-3.5 ${width} rounded`} /><Skeleton className="h-3 w-full rounded" /></div></div>)}</div>;
}
