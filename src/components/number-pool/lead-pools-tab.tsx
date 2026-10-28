"use client";

import { useRef, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";

import { showSuccessNotification } from "@/hooks/useNotification";
import { useCreateLeadPool, useDeleteLeadPool, useImportLeadSheet, useLeadPools, useLeads, useUpdateLeadPool } from "@/hooks/hooks";
import type { LeadImportResult, LeadPool, LeadPoolCreate, LeadPoolUpdate } from "@/types/types";
import { Button } from "../calling-agent/ui";

const fieldClass = "mt-1 w-full rounded-md border border-hairline-strong bg-surface-input px-3 py-2 text-heading transition-colors hover:border-accent-strong focus:border-accent-strong focus:outline-none";
const fmtDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function LeadPoolForm({
  pool,
  pending,
  onClose,
  onSave,
}: {
  pool: LeadPool | null;
  pending: boolean;
  onClose: () => void;
  onSave: (createBody: LeadPoolCreate, updateBody: LeadPoolUpdate) => void;
}) {
  const [name, setName] = useState(pool?.name ?? "");
  const [status, setStatus] = useState<LeadPoolCreate["status"]>(pool?.status ?? "active");
  const [startNumber, setStartNumber] = useState(String(pool?.numbers?.[0] ?? ""));
  const [endNumber, setEndNumber] = useState(String(pool?.numbers?.at(-1) ?? ""));
  const start = Number(startNumber);
  const end = Number(endNumber);
  const validRange = Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start;
  const hasCompleteRange = startNumber.trim() !== "" && endNumber.trim() !== "";

  const save = () => {
    if (!validRange) return;
    onSave(
      { name: name.trim(), status, start_number: start, end_number: end },
      { name: name.trim(), status, start_number: start, end_number: end },
    );
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="animate-slide-in-right flex h-full max-h-screen w-full max-w-md flex-col overflow-hidden bg-surface shadow-xl">
        <div className="shrink-0 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-heading">{pool && <Pencil size={18} className="text-accent-text" />}{pool ? "Edit lead pool" : "New lead pool"}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-heading"><X size={20} /></button>
          </div>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <label className="block text-sm text-body">Name<input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></label>
          <label className="block text-sm text-body">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as LeadPoolCreate["status"])} className={fieldClass}>
              <option value="active">Active</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="paused">Paused</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-body">Start Number<input type="number" min={1} step={1} value={startNumber} onChange={(event) => setStartNumber(event.target.value)} className={fieldClass} /></label>
            <label className="block text-sm text-body">End Number<input type="number" min={1} step={1} value={endNumber} onChange={(event) => setEndNumber(event.target.value)} className={fieldClass} /></label>
          </div>
          {hasCompleteRange && !validRange && <p className="text-sm text-warn">Enter a valid number range. End Number must be at least Start Number.</p>}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-hairline bg-raised px-5 py-4 sm:px-6">
          <Button onClick={save} disabled={pending || !name.trim() || !validRange}>{pending ? "Saving..." : "Save"}</Button>
        </div>
      </aside>
    </div>
  );
}

function LeadPoolDetails({ pool, onClose }: { pool: LeadPool; onClose: () => void }) {
  const fields: Array<[string, string]> = [
    ["Name", pool.name], ["Status", pool.status], ["Pool Size", String(pool.pool_size)],
    ["Created At", fmtDate(pool.created_at)], ["Updated At", fmtDate(pool.updated_at)],
  ];
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="animate-slide-in-right flex h-full max-h-screen w-full max-w-lg flex-col overflow-hidden bg-surface shadow-xl">
        <div className="shrink-0 border-b border-hairline px-5 py-4 sm:px-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold text-heading"><Eye size={18} className="text-accent-text" /> Lead pool details</h2><button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-heading"><X size={20} /></button></div></div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {fields.map(([label, value]) => <div key={label} className="px-3 py-2"><dt className="font-medium text-muted">{label}</dt><dd className="mt-1 break-all text-heading">{value}</dd></div>)}
            <div className="px-3 py-2 sm:col-span-2"><dt className="font-medium text-muted">Numbers</dt><dd className="mt-1 space-y-1 break-all text-heading">{(pool.numbers ?? []).map((number) => <div key={number}>{number}</div>)}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

export function LeadPoolsTab() {
  const { data: pools = [], isLoading, isError, error } = useLeadPools();
  const create = useCreateLeadPool();
  const update = useUpdateLeadPool();
  const remove = useDeleteLeadPool();
  const importSheet = useImportLeadSheet();
  const { data: leads = [], isLoading: leadsLoading, isError: leadsError, error: leadsQueryError } = useLeads();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<LeadPool | null | undefined>(undefined);
  const [viewing, setViewing] = useState<LeadPool | null>(null);
  const [deleting, setDeleting] = useState<LeadPool | null>(null);
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
  const [showImportResult, setShowImportResult] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [numbersPool, setNumbersPool] = useState<LeadPool | null>(null);
  const filteredLeads = leads.filter((lead) =>
    [lead.full_name ?? "", lead.phone_e164, String(lead.lead_number), ...lead.pool_ids]
      .some((value) => value.toLowerCase().includes(leadSearch.trim().toLowerCase())),
  );
  const poolLeads = numbersPool ? leads.filter((lead) => lead.pool_ids.includes(numbersPool.id)) : [];

  const save = (createBody: LeadPoolCreate, updateBody: LeadPoolUpdate) => {
    if (editing) {
      update.mutate({ id: editing.id, body: updateBody }, { onSuccess: (saved) => {
        showSuccessNotification(`"${saved.name}" was updated.`, { title: "Lead pool updated" });
        setEditing(undefined);
      } });
    } else {
      create.mutate(createBody, { onSuccess: (saved) => {
        showSuccessNotification(`"${saved.name}" was created.`, { title: "Lead pool created" });
        setEditing(undefined);
      } });
    }
  };

  return (
    <section>
      <div className="mb-4 flex justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          aria-label="Select lead sheet to import"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            importSheet.mutate(file, { onSuccess: (result) => {
              showSuccessNotification(`${result.imported_count} leads imported.`, { title: "Lead sheet imported" });
              setImportResult(result);
              setLeadSearch("");
              setShowImportResult(true);
            } });
          }}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={importSheet.isPending}
        >
          <Upload size={16} /> {importSheet.isPending ? "Importing..." : "Import Lead Sheet"}
        </Button>
        <Button onClick={() => { setLeadSearch(""); setShowImportResult(true); }}>
          Show Leads
        </Button>
        <Button onClick={() => setEditing(null)}><Plus size={16} /> New Lead Pool</Button>
      </div>
      {importSheet.isError && <p className="mb-3 text-right text-sm text-loss">Import failed: {(importSheet.error as Error).message}</p>}
      <div className="overflow-x-auto rounded-lg border border-hairline bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted"><tr>{["Name", "Status", "Pool Size", "Numbers", "Created At", "Action"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-hairline">
            {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted">Loading lead pools...</td></tr>}
            {isError && <tr><td colSpan={6} className="p-8 text-center text-loss">Failed to load lead pools: {(error as Error).message}</td></tr>}
            {!isLoading && !isError && pools.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted">No lead pools yet</td></tr>}
            {pools.map((pool) => (
              <tr key={pool.id} className="transition-colors hover:bg-surface-hover">
                <td className="px-4 py-3 font-medium text-heading">{pool.name}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-medium ${pool.status === "active" ? "bg-gain-bg text-gain" : "bg-chip text-muted"}`}>{pool.status.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase())}</span></td>
                <td className="px-4 py-3 font-medium text-heading">{pool.pool_size}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => setNumbersPool(pool)} className="text-sm text-accent-text underline underline-offset-2 transition-colors hover:text-accent">Show Leads</button></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(pool.created_at)}</td>
                <td className="px-4 py-3"><div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button type="button" title="Update" aria-label={`Update ${pool.name}`} onClick={() => setEditing(pool)} className="text-muted transition-colors hover:text-accent-text"><Pencil size={18} /></button>
                    <button type="button" title="Delete" aria-label={`Delete ${pool.name}`} onClick={() => setDeleting(pool)} disabled={remove.isPending} className="text-muted transition-colors hover:text-accent-text disabled:opacity-40"><Trash2 size={18} /></button>
                  </div>
                  <button type="button" title={`View ${pool.name}`} onClick={() => setViewing(pool)} className="text-sm text-accent-text underline underline-offset-2 transition-colors hover:text-accent">View</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <LeadPoolForm key={editing?.id ?? "new"} pool={editing} pending={create.isPending || update.isPending} onClose={() => setEditing(undefined)} onSave={save} />}
      {viewing && <LeadPoolDetails pool={viewing} onClose={() => setViewing(null)} />}
      {numbersPool && (
        <div className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/40">
          <aside role="dialog" aria-modal="true" aria-labelledby="pool-numbers-title" className="animate-slide-in-right flex h-full max-h-screen w-full max-w-lg flex-col overflow-hidden bg-surface shadow-xl">
            <div className="shrink-0 border-b border-hairline px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <h2 id="pool-numbers-title" className="text-lg font-semibold text-heading">{numbersPool.name} leads</h2>
                <button type="button" onClick={() => setNumbersPool(null)} aria-label="Close" className="text-muted transition-colors hover:text-heading"><X size={20} /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {leadsLoading && <p className="text-sm text-muted">Loading leads...</p>}
              {leadsError && <p className="text-sm text-loss">Failed to load leads: {(leadsQueryError as Error).message}</p>}
              {!leadsLoading && !leadsError && poolLeads.length === 0 && <p className="text-sm text-muted">No leads in this pool.</p>}
              {!leadsLoading && !leadsError && poolLeads.length > 0 && (
                <div className="text-sm">
                  <div className="sticky top-0 grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-hairline bg-surface py-2 font-medium text-muted"><span>S.No</span><span>Name</span><span>Number</span></div>
                  <div className="divide-y divide-hairline">{poolLeads.map((lead, index) => <div key={lead.id} className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] gap-4 py-3"><span className="text-muted">{index + 1}</span><span className="break-words text-heading">{lead.full_name || "—"}</span><span className="break-all text-heading">{lead.phone_e164}</span></div>)}</div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      {showImportResult && (
        <div className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/40">
          <aside role="dialog" aria-modal="true" aria-labelledby="lead-import-result-title" className="animate-slide-in-right flex h-full max-h-screen w-full max-w-lg flex-col overflow-hidden bg-surface shadow-xl">
            <div className="shrink-0 border-b border-hairline px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between"><h2 id="lead-import-result-title" className="text-lg font-semibold text-heading">Imported leads</h2><button type="button" onClick={() => setShowImportResult(false)} aria-label="Close" className="text-muted transition-colors hover:text-heading"><X size={20} /></button></div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <label className="relative mb-4 block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder="Search leads by name, phone, or number" className={`${fieldClass} mt-0 pl-9`} />
              </label>
              {importResult && <>
                <h3 className="text-sm font-semibold text-heading">Lead sheet import results</h3>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-md bg-surface-input p-3"><dt className="text-muted">Rows read</dt><dd className="mt-1 font-semibold text-heading">{importResult.rows_read}</dd></div>
              <div className="rounded-md bg-surface-input p-3"><dt className="text-muted">Imported</dt><dd className="mt-1 font-semibold text-heading">{importResult.imported_count}</dd></div>
              <div className="rounded-md bg-surface-input p-3"><dt className="text-muted">Duplicates</dt><dd className="mt-1 font-semibold text-heading">{importResult.duplicate_count}</dd></div>
            </dl>
            {importResult.invalid_rows?.length > 0 && (
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-heading">Rows needing attention</h3>
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm text-loss">
                  {importResult.invalid_rows.map((issue) => <li key={`${issue.row_number}-${issue.reason}`}>Row {issue.row_number}: {issue.reason}</li>)}
                </ul>
              </div>
            )}
              </>}
            <div className="mt-5">
              {leadsLoading && <p className="mt-2 text-sm text-muted">Loading leads...</p>}
              {leadsError && <p className="mt-2 text-sm text-loss">Failed to load leads: {(leadsQueryError as Error).message}</p>}
              {!leadsLoading && !leadsError && filteredLeads.length === 0 && <p className="mt-2 text-sm text-muted">{leads.length ? "No leads match your search." : "No leads found."}</p>}
              {!leadsLoading && !leadsError && filteredLeads.length > 0 && (
                <div className="mt-2 max-h-[55vh] overflow-y-auto text-sm">
                  <div className="sticky top-0 grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-hairline bg-surface py-2 font-medium text-muted"><span>S.No</span><span>Name</span><span>Number</span></div>
                  <div className="divide-y divide-hairline">
                    {filteredLeads.map((lead, index) => <div key={lead.id} className="grid grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] gap-4 py-3"><span className="text-muted">{index + 1}</span><span className="break-words text-heading">{lead.full_name || "—"}</span><span className="break-all text-heading">{lead.phone_e164}</span></div>)}
                  </div>
                </div>
              )}
            </div>
            </div>
          </aside>
        </div>
      )}
      {deleting && <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div role="alertdialog" aria-modal="true" aria-labelledby="delete-lead-pool-title" className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl"><div className="flex items-center justify-between"><h2 id="delete-lead-pool-title" className="text-lg font-semibold text-heading">Delete lead pool?</h2><button type="button" onClick={() => setDeleting(null)} disabled={remove.isPending} aria-label="Close" className="text-muted transition-colors hover:text-heading disabled:opacity-50"><X size={20} /></button></div><p className="mt-2 text-sm text-muted">Are you sure you want to delete “{deleting.name}”?</p><div className="mt-6 flex justify-end"><Button onClick={() => remove.mutate(deleting.id, { onSuccess: () => { showSuccessNotification(`"${deleting.name}" was deleted.`, { title: "Lead pool deleted" }); setDeleting(null); } })} disabled={remove.isPending}>{remove.isPending ? "Deleting..." : "Delete"}</Button></div></div></div>}
    </section>
  );
}
