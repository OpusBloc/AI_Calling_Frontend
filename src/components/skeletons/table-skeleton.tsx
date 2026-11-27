import clsx from "clsx";
import { Skeleton } from "./skeleton";
import type { TableColumnConfig } from "./table-columns";

export function TableSkeleton({
  columns,
  rows = 5,
  rowHeight = "py-3",
}: {
  columns: TableColumnConfig[];
  rows?: number;
  rowHeight?: string;
}) {
  const widths = ["w-[72%]", "w-[54%]", "w-[86%]", "w-[63%]", "w-[77%]"];
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="border-b border-hairline last:border-0">
          {columns.map((column, index) => (
            <td key={column.label || `actions-${index}`} className={clsx("px-4", rowHeight)} style={{ width: column.width }}>
              <CellSkeleton kind={column.kind ?? "text"} width={widths[(row + index) % widths.length]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function TableSkeletonShell({ columns, rows = 5, label }: { columns: TableColumnConfig[]; rows?: number; label?: string }) {
  return (
    <div className="no-scrollbar overflow-x-auto rounded-lg border border-hairline bg-surface shadow-sm">
      <table className="w-full text-left text-sm" aria-label={label}>
        <colgroup>{columns.map((column, index) => <col key={column.label || `actions-${index}`} style={{ width: column.width }} />)}</colgroup>
        <thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted"><tr>{columns.map((column, index) => <th key={column.label || `actions-${index}`} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{column.label || <span className="sr-only">Actions</span>}</th>)}</tr></thead>
        <tbody aria-busy="true" aria-live="polite"><tr className="sr-only"><td colSpan={columns.length}>Loading…</td></tr><TableSkeleton columns={columns} rows={rows} /></tbody>
      </table>
    </div>
  );
}

function CellSkeleton({ kind, width }: { kind: NonNullable<TableColumnConfig["kind"]>; width: string }) {
  if (kind === "actions") return <div className="flex justify-end gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div>;
  if (kind === "status") return <Skeleton className="h-6 w-20 rounded-full" />;
  if (kind === "avatar") return <div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-24 rounded" /></div>;
  if (kind === "number") return <Skeleton className="h-4 w-12 rounded" />;
  if (kind === "date") return <Skeleton className={clsx("h-4 rounded", width)} />;
  if (kind === "subtitle") return <div className="space-y-1.5"><Skeleton className={clsx("h-4 rounded", width)} /><Skeleton className="h-3 w-[45%] rounded" /></div>;
  if (kind === "content") return <div className="space-y-1.5"><Skeleton className={clsx("h-3.5 rounded", width)} /><Skeleton className="h-3.5 w-[78%] rounded" /></div>;
  return <Skeleton className={clsx("h-4 rounded", width)} />;
}

