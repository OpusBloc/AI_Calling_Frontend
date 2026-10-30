"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Phone, Plus, RefreshCw, Trash2 } from "lucide-react";

import type { PlivoPool } from "@/types/types";
import { useDeletePlivoPool, usePlivoNumbers, usePlivoPools, useSyncPlivoNumbers } from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LinkRow,
  Pagination,
  SearchInput,
  SectionHeader,
  SkeletonRows,
  StatusBadge,
  Table,
  TableMessage,
  formatDay,
  usePagination,
} from "@/components/ui";

const HEAD = ["Pool", "Status", "Numbers", "Created", ""];

export const deletePoolMessage = (name: string) =>
  `"${name}" will be deleted and its numbers freed for other pools. Campaigns using it will no longer call from these numbers.`;

export function PoolsTab() {
  const router = useRouter();
  const pools = usePlivoPools();
  const numbers = usePlivoNumbers();
  const remove = useDeletePlivoPool();
  const sync = useSyncPlivoNumbers();
  const [search, setSearch] = useState("");

  const all = pools.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = all.filter(
    (p) => !term || p.name.toLowerCase().includes(term) || p.phone_numbers.some((n) => n.includes(term)),
  );
  const pagination = usePagination(filtered);
  const unassigned = (numbers.data ?? []).filter((n) => !n.plivo_pool_id).length;

  const handleDelete = async (pool: PlivoPool) => {
    const ok = await confirmDialog({ title: "Delete Plivo pool?", message: deletePoolMessage(pool.name), confirmLabel: "Delete pool" });
    if (!ok) return;
    remove.mutate(pool.id, {
      onSuccess: () => showSuccessNotification(`"${pool.name}" was deleted.`, { title: "Pool deleted" }),
    });
  };

  const handleSync = () =>
    sync.mutate(undefined, {
      onSuccess: () => showSuccessNotification("Numbers are up to date with your Plivo account.", { title: "Numbers synced" }),
    });

  const newButton = (
    <Button onClick={() => router.push("/number-pool/pools/new")}>
      <Plus size={16} aria-hidden /> New pool
    </Button>
  );

  return (
    <section>
      <SectionHeader
        title="Plivo pools"
        description={
          numbers.data
            ? `${numbers.data.length} Plivo numbers synced · ${unassigned} not in any pool.`
            : "Groups of Plivo numbers that campaigns call from."
        }
        action={
          <>
            <Button variant="secondary" onClick={handleSync} disabled={sync.isPending}>
              <RefreshCw size={16} aria-hidden className={sync.isPending ? "animate-spin" : ""} />
              {sync.isPending ? "Syncing…" : "Sync numbers"}
            </Button>
            {newButton}
          </>
        }
      />

      {pools.isError ? (
        <ErrorState message={(pools.error as Error).message} onRetry={() => pools.refetch()} />
      ) : pools.isSuccess && all.length === 0 ? (
        <EmptyState
          icon={<Phone size={20} />}
          title="No Plivo pools yet"
          text="Sync your Plivo numbers, then group them into a pool that campaigns can call from."
          action={newButton}
        />
      ) : (
        <div className="space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search pools or numbers" className="w-full sm:w-72" />
          <Table head={HEAD} label="Plivo pools">
            {pools.isLoading ? (
              <SkeletonRows cols={HEAD.length} />
            ) : filtered.length === 0 ? (
              <TableMessage cols={HEAD.length}>No pools match “{search}”.</TableMessage>
            ) : (
              pagination.pageItems.map((p) => (
                <LinkRow key={p.id} href={`/number-pool/pools/${encodeURIComponent(p.id)}`}>
                  <td className="px-4 py-3 font-medium text-heading">{p.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="tnum font-medium text-heading">{p.phone_numbers.length}</span>
                    {p.phone_numbers.length > 0 && (
                      <span className="tnum ml-2 text-xs text-muted">
                        {p.phone_numbers.slice(0, 2).join(", ")}
                        {p.phone_numbers.length > 2 && ` +${p.phone_numbers.length - 2} more`}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDay(p.created_at)}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <IconButton label={`Edit ${p.name}`} onClick={() => router.push(`/number-pool/pools/${p.id}/edit`)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        label={`Delete ${p.name}`}
                        tone="danger"
                        disabled={remove.isPending && remove.variables === p.id}
                        onClick={() => handleDelete(p)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </LinkRow>
              ))
            )}
          </Table>
          <Pagination {...pagination} noun="pools" />
        </div>
      )}

    </section>
  );
}
