"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Eye, RefreshCw, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  usePlivoPools, useCreatePlivoPool, useUpdatePlivoPool, useDeletePlivoPool, usePlivoNumbers, useSyncPlivoNumbers,
} from "../../hooks/hooks";
import { PlivoPool } from "../../types/types";
import { NumberMultiSelect } from "./number-multi-select";
import { Button } from "../calling-agent/ui";
import { showSuccessNotification } from "@/hooks/useNotification";

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const formFieldClass = "mt-1 w-full min-w-0 rounded-md border border-hairline-strong bg-surface-input px-3 py-2 text-heading transition-colors hover:border-accent-strong focus:border-accent-strong focus:outline-none";

// Create / edit modal. pool = null means "create".
function PoolModal({ pool, onClose }: { pool: PlivoPool | null; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const [name, setName] = useState(pool?.name ?? "");
  const [status, setStatus] = useState<PlivoPool["status"]>(pool?.status ?? "active");
  const concurrencyLimit = pool?.concurrency_limit ?? 1;
  const [selected, setSelected] = useState<string[]>(pool?.phone_numbers ?? []);
  const [poolSize, setPoolSize] = useState(pool?.pool_size ?? pool?.phone_numbers.length ?? 0);
  const onCloseRef = useRef(onClose);
  const closeRequestRef = useRef<() => void>(() => {});
  onCloseRef.current = onClose;
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => onCloseRef.current(), 260);
  };
  closeRequestRef.current = requestClose;

  const create = useCreatePlivoPool();
  const update = useUpdatePlivoPool();
 const { data: numbers = [], isLoading: numbersLoading } = usePlivoNumbers();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRequestRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Show numbers with no pool, plus the ones already in this pool
  const choices = numbers.filter((n) => !n.plivo_pool_id || n.plivo_pool_id === pool?.id);

  const mutation = pool ? update : create;

  const save = () => {
    const body = { name: name.trim(), status, concurrency_limit: concurrencyLimit, phone_numbers: selected };
    if (pool) {
      update.mutate({ id: pool.id, body }, { onSuccess: () => {
        showSuccessNotification(`"${body.name}" was updated.`, { title: "Pool updated" });
        requestClose();
      } });
    } else {
      create.mutate(body, { onSuccess: () => {
        showSuccessNotification(`"${body.name}" was created.`, { title: "Pool created" });
        requestClose();
      } });
    }
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/40">
      <div data-pool-modal className={`${closing ? "animate-slide-out-right" : "animate-slide-in-right"} flex h-full max-h-screen w-full max-w-md flex-col overflow-hidden bg-surface shadow-xl`}>
        <div className="shrink-0 border-b px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {pool && <Pencil size={18} className="text-accent-text" />}
            {pool ? "Edit pool" : "New pool"}
          </h2>
          <button type="button" onClick={requestClose} aria-label="Close" className="text-muted transition-colors hover:text-heading"><X size={20} /></button>
          </div>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <label className="block text-sm">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)}
            className={formFieldClass} />
        </label>

        <label className="block text-sm">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as PlivoPool["status"])}
            className={formFieldClass}>
            <option value="active">Active</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
          </select>
        </label>

        <label className="block text-sm">
          Pool Size
          <input
            type="number"
            min={0}
            max={choices.length}
            value={poolSize}
            onChange={(event) => setPoolSize(Math.min(choices.length, Math.max(0, Number(event.target.value))))}
            className={formFieldClass}
          />
          <span className="mt-1 block text-xs text-muted">Select exactly {poolSize} phone number{poolSize === 1 ? "" : "s"} below.</span>
        </label>

        <label className="block text-sm">
        Numbers
        <NumberMultiSelect
            options={choices}
            selected={selected}
            onChange={setSelected}
            isLoading={numbersLoading}
            maxSelections={poolSize}
        />
        </label>

        {selected.length !== poolSize && (
          <p className="text-sm text-warn">Selected {selected.length} of {poolSize} phone numbers.</p>
        )}

        </div>

        <div data-pool-modal-footer className="flex shrink-0 justify-end gap-2 border-t border-hairline bg-raised px-5 py-4 sm:px-6">
          <Button onClick={save} disabled={!name.trim() || mutation.isPending || selected.length !== poolSize}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ViewPoolModal({ pool, onClose }: { pool: PlivoPool; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const { name, status, pool_size, phone_numbers, created_at, updated_at } = pool;
  const apiFields: Array<[string, string]> = [
    ["name", name],
    ["status", status],
    ["pool_size", String(pool_size)],
  ];
  const dateFields: Array<[string, string]> = [["created_at", created_at], ["updated_at", updated_at]];
  const onCloseRef = useRef(onClose);
  const closeRequestRef = useRef<() => void>(() => {});
  onCloseRef.current = onClose;
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => onCloseRef.current(), 260);
  };
  closeRequestRef.current = requestClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRequestRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className={`${closing ? "animate-slide-out-right" : "animate-slide-in-right"} flex h-full max-h-screen w-full max-w-lg flex-col overflow-hidden bg-surface shadow-xl`}>
        <div className="shrink-0 border-b px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Eye size={18} className="text-accent-text" /> Pool details
          </h2>
          <button type="button" onClick={requestClose} aria-label="Close" className="text-muted transition-colors hover:text-heading"><X size={20} /></button>
          </div>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
          <div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {apiFields.map(([key, value]) => (
                <div key={key} className="min-w-0 px-3 py-2">
                  <dt className="font-medium capitalize text-muted">{key.replace(/_/g, " ")}</dt>
                  <dd className="mt-1 break-all text-heading">{value}</dd>
                </div>
              ))}
              {dateFields.map(([key, value]) => (
                <div key={key} className="min-w-0  px-3 py-2">
                  <dt className="font-medium text-muted">{key === "created_at" ? "Created At" : "Updated At"}</dt>
                  <dd className="mt-1 text-heading">{new Date(value).toLocaleString(undefined, {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</dd>
                </div>
              ))}
              <div className="min-w-0 px-3 py-2 sm:col-span-2">
                <dt className="font-medium capitalize text-muted">Phone numbers</dt>
                {phone_numbers.length > 0 ? (
                  <dd className="mt-1 text-heading">
                    <ul className="list-none space-y-1">
                      {phone_numbers.map((phone) => <li key={phone} className="break-all">{phone}</li>)}
                    </ul>
                  </dd>
                ) : <dd className="mt-1 text-muted">None</dd>}
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PoolsTab() {
  const { data: pools = [], isLoading, isError, error } = usePlivoPools();
  const remove = useDeletePlivoPool();
  const sync = useSyncPlivoNumbers();
  const [modal, setModal] = useState<{ pool: PlivoPool | null } | null>(null);
  const [viewPool, setViewPool] = useState<PlivoPool | null>(null);
  const [deletePool, setDeletePool] = useState<PlivoPool | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(pools.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visiblePools = pools.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button onClick={() => sync.mutate(undefined, {
          onSuccess: () => showSuccessNotification("Plivo numbers have been synchronized.", { title: "Numbers synced" }),
        })} disabled={sync.isPending}>
          <RefreshCw size={16} className={sync.isPending ? "animate-spin" : ""} />
          {sync.isPending ? "Syncing..." : "Sync"}
        </Button>
        <Button onClick={() => setModal({ pool: null })}>
          <Plus size={16} /> New Pool
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-hairline bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted">
            <tr>
              {["Pool Name", "Status", "Pool Size", "Numbers", "Created At", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {isLoading && <tr><td colSpan={6} className="p-8 text-center text-muted">Loading...</td></tr>}
            {isError && (
              <tr><td colSpan={6} className="p-8 text-center text-loss">
                Failed to load pools: {(error as Error).message}
              </td></tr>
            )}
            {!isLoading && !isError && pools.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted">No pools yet</td></tr>
            )}
            {visiblePools.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-surface-hover">
                <td className="px-4 py-3">
                  <span className="font-medium text-heading">{p.name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    p.status === "active" ? "bg-gain-bg text-gain" :
                    p.status === "paused" ? "bg-chip text-muted" :
                    p.status === "completed" ? "bg-chip text-muted" :
                    "bg-chip text-muted"
                  }`}>
                    {p.status.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase())}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-heading">{p.pool_size}</td>
                <td className="px-4 py-3 text-body">
                  {p.phone_numbers.length > 0 && (
                    <div className="mt-1 max-w-xs break-words text-xs text-muted">
                      {p.phone_numbers.join(", ")}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{fmtDate(p.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-4">
                    <button title="Edit" aria-label={`Update ${p.name}`} onClick={() => setModal({ pool: p })} className="text-muted transition-colors hover:text-accent-text">
                      <Pencil size={18} />
                    </button>
                    <button title="Delete" aria-label={`Delete ${p.name}`} onClick={() => setDeletePool(p)} disabled={remove.isPending}
                      className="text-muted transition-colors hover:text-accent-text disabled:opacity-40">
                      <Trash2 size={18} />
                    </button>
                    <button title={`View ${p.name}`} onClick={() => setViewPool(p)} className="inline-flex items-center text-sm text-body underline underline-offset-2 transition-colors hover:text-accent-text">
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Page {currentPage} of {pageCount}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1 || isLoading || isError}
            className="inline-flex items-center gap-1 rounded-md border border-hairline px-3 py-2 text-sm text-body transition-colors hover:bg-surface-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span aria-current="page" className="min-w-8 text-center text-sm font-medium text-heading">{currentPage}</span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            disabled={currentPage >= pageCount || isLoading || isError}
            className="inline-flex items-center gap-1 rounded-md border border-hairline px-3 py-2 text-sm text-body transition-colors hover:bg-surface-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {modal && <PoolModal pool={modal.pool} onClose={() => setModal(null)} />}
      {viewPool && <ViewPoolModal pool={viewPool} onClose={() => setViewPool(null)} />}
      {deletePool && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-pool-title" className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between"><h2 id="delete-pool-title" className="text-lg font-semibold text-heading">Delete pool?</h2><button type="button" onClick={() => setDeletePool(null)} disabled={remove.isPending} aria-label="Close" className="text-muted transition-colors hover:text-heading disabled:opacity-50"><X size={20} /></button></div>
            <p className="mt-2 text-sm text-muted">Are you sure you want to delete “{deletePool.name}”? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => remove.mutate(deletePool.id, { onSuccess: () => {
                showSuccessNotification(`"${deletePool.name}" was deleted.`, { title: "Pool deleted" });
                setDeletePool(null);
              } })} disabled={remove.isPending}>{remove.isPending ? "Deleting…" : "Delete"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
