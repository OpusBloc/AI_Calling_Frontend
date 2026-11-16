import { StatCardSkeleton } from "./card-skeleton";
import { TableSkeletonShell } from "./table-skeleton";
import { AGENT_COLUMNS, REPRESENTATIVE_COLUMNS } from "./table-columns";
import { Skeleton, RouteSkeleton } from "./skeleton";
import { CLASSIFICATION_COLUMNS } from "./table-columns";

export function CallingAgentSkeleton({ representatives = false }: { representatives?: boolean }) {
  const columns = representatives ? REPRESENTATIVE_COLUMNS : AGENT_COLUMNS;
  const title = representatives ? "Call Transfer" : "Agents";
  const description = representatives ? "People a live call can be transferred to. Campaigns ring active transfer agents in turn." : "Each agent is a voice persona: intro, rules, knowledge, ending and optional notes. Campaigns pick one agent.";
  const action = representatives ? "Add transfer agent" : "New agent";
  return (
    <RouteSkeleton>
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-hairline pb-3"><span className="rounded-md px-3 py-2 text-sm text-muted">Agents</span><span className="rounded-md px-3 py-2 text-sm text-muted">Call Transfer</span></div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-heading">{title}</h2><p className="mt-1 text-sm text-muted">{description}</p></div><button type="button" disabled className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">{action}</button></div>
          <TableSkeletonShell columns={columns} rows={6} label={title} />
        </div>
      </div>
    </RouteSkeleton>
  );
}

export function AgentEditorSkeleton() {
  return (
    <RouteSkeleton>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-semibold text-heading">New agent</h1><p className="mt-1 text-sm text-muted">Configure the voice and behavior for this agent.</p></div>
        <div className="flex flex-wrap gap-2 border-b border-hairline pb-3">{["Details", "Voice", "Prompt", "WhatsApp", "Classifications", "Review"].map((label) => <span key={label} className="rounded-md px-3 py-2 text-sm text-muted">{label}</span>)}</div>
        <div className="space-y-4 rounded-lg border border-hairline bg-surface p-5"><Skeleton className="h-5 w-28 rounded" /><Skeleton className="h-3 w-64 rounded" /><div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-10 w-full rounded-md" /><Skeleton className="h-10 w-full rounded-md" /></div><Skeleton className="h-32 w-full rounded-md" /></div>
      </div>
    </RouteSkeleton>
  );
}

export function AgentDetailsSkeleton() {
  return <RouteSkeleton><div className="mx-auto max-w-5xl space-y-5"><Skeleton className="h-8 w-64 rounded" /><div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)}</div><Skeleton className="h-64 w-full rounded-lg" /></div></RouteSkeleton>;
}

export function VoiceCardsSkeleton({ count = 6 }: { count?: number }) {
  return <div aria-hidden="true" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: count }, (_, i) => <div key={i} className="flex min-w-0 items-center gap-3 rounded-xl border border-hairline bg-surface px-3 py-2"><Skeleton className="h-6 w-6 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-1.5"><Skeleton className={`h-4 rounded ${i % 2 ? "w-3/4" : "w-1/2"}`} /><Skeleton className="h-3 w-2/3 rounded" /></div><Skeleton className="h-8 w-8 shrink-0 rounded-full" /><Skeleton className="h-8 w-8 shrink-0 rounded-full" /></div>)}</div>;
}

export function StockVoicesSkeleton() {
  return <div aria-hidden="true" className="h-80 overflow-hidden rounded-md border border-hairline p-2"><VoiceCardsSkeleton count={6} /></div>;
}

export function VoiceSamplesSkeleton() {
  return <div aria-hidden="true" className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-md" />)}</div>;
}

export function VoiceSampleDetailsSkeleton() {
  return <div aria-hidden="true" className="grid grid-cols-2 gap-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9 rounded" />)}</div>;
}

export function ClassificationTableSkeleton() {
  return <>{Array.from({ length: 3 }, (_, row) => <tr key={row} aria-hidden="true" className="border-t border-hairline">{CLASSIFICATION_COLUMNS.map((column, index) => <td key={column.label || index} className="px-5 py-4" style={{ width: column.width }}>{column.kind === "actions" ? <div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div> : <Skeleton className={`h-4 rounded ${index === 1 ? "w-4/5" : index === 2 ? "w-10" : "w-3/4"}`} />}</td>)}</tr>)}</>;
}

export function ClassificationDetailsSkeleton() {
  return <div aria-hidden="true" className="space-y-4"><Skeleton className="h-20 rounded-lg" /><Skeleton className="h-32 rounded-lg" /></div>;
}

export function VoiceDetailsSkeleton() {
  return <div aria-hidden="true" className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}</div><Skeleton className="h-24 rounded-md" /></div>;
}

export function ClassificationCallsSkeleton() {
  return <div aria-hidden="true" className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-md" />)}</div>;
}

export function AudioPreviewSkeleton() {
  return <Skeleton className="h-10 w-full rounded-md" />;
}

export function AuthGuardSkeleton() {
  return <RouteSkeleton><div aria-hidden="true" className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8"><Skeleton className="h-10 w-full rounded-lg" /><div className="grid flex-1 grid-cols-[220px_1fr] gap-6"><Skeleton className="h-full min-h-96 rounded-lg" /><Skeleton className="h-full min-h-96 rounded-lg" /></div></div></RouteSkeleton>;
}
