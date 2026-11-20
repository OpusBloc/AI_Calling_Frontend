import { Skeleton, RouteSkeleton } from "./skeleton";
import { TableSkeletonShell } from "./table-skeleton";
import { TEMPLATE_COLUMNS } from "./table-columns";

export function TemplatesSkeleton() {
  return <RouteSkeleton><div className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-heading">WhatsApp messages</h2><p className="mt-1 text-sm text-muted">Template messages agents can send to the customer during or after a call. Attach them to an agent.</p></div><div className="flex gap-2"><button type="button" disabled className="h-9 rounded-md border border-hairline px-3 text-sm text-muted">Delivery activity</button></div></div><TableSkeletonShell columns={TEMPLATE_COLUMNS} rows={6} label="WhatsApp messages" /></div></RouteSkeleton>;
}

export function DeliveryListSkeleton() {
  return <div aria-hidden="true" className="space-y-3"><Skeleton className="h-20 rounded-md" /><Skeleton className="h-20 rounded-md" /><Skeleton className="h-20 rounded-md" /></div>;
}

export function DeliveryDetailSkeleton() {
  return <div aria-hidden="true" className="space-y-3"><Skeleton className="h-20 rounded-md" /><Skeleton className="h-28 rounded-md" /></div>;
}
