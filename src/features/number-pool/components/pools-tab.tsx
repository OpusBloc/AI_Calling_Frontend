"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Phone, Plus, RefreshCw } from "lucide-react";

import type { PlivoPool } from "@/types/types";
import { useDeletePlivoPool, usePlivoNumbers, usePlivoPools, useSyncPlivoNumbers } from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import { DeleteIconButton } from "@/components/ui/ActionIconButtons";
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LinkRow,
  Pagination,
  SearchInput,
  SectionHeader,
  StatusBadge,
  Table,
  TableMessage,
  usePagination,
} from "@/components/ui";
import { TableSkeleton, useSkeletonVisibility } from "@/components/skeletons";
import { POOL_COLUMNS } from "@/components/skeletons/table-columns";

const HEAD = POOL_COLUMNS.map((column) => column.label);

export const deletePoolMessage = (name: string) =>
  `"${name}" will be deleted and its numbers freed for other pools. Campaigns using it will no longer call from these numbers.`;

export function PoolsTab() {
  const router = useRouter();
  const pools = usePlivoPools();
  const numbers = usePlivoNumbers();
  const remove = useDeletePlivoPool();
  const sync = useSyncPlivoNumbers();
  const [search, setSearch] = useState("");
  const showPoolSkeleton = useSkeletonVisibility(pools.isLoading);

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
    <Button className="btn-blue-filled" onClick={() => router.push("/number-pool/pools/new")}>
      <Plus size={16} aria-hidden /> New pool
    </Button>
  );

  return (
    <section className="blue-fields">
      <SectionHeader
        title="Plivo pools"
        description={
          numbers.data
            ? `${numbers.data.length} Plivo numbers synced · ${unassigned} not in any pool.`
            : "Groups of Plivo numbers that campaigns call from."
        }
        action={
          <>
            <Button variant="secondary" className="btn-blue" onClick={handleSync} loading={sync.isPending}>
              <RefreshCw size={16} aria-hidden />
              Sync numbers
            </Button>
            {newButton}
          </>
        }
      />

      {pools.isError ? (
        <ErrorState message={(pools.error as Error).message} onRetry={() => pools.refetch()} />
      ) : pools.isSuccess && all.length === 0 && !showPoolSkeleton ? (
        <EmptyState
          icon={<Phone size={20} />}
          title="No Plivo pools yet"
          text="Sync your Plivo numbers, then group them into a pool that campaigns can call from."
          action={newButton}
        />
      ) : (
        <div className="space-y-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search pools or numbers" className="w-full sm:w-72" />
          <Table head={HEAD} columns={POOL_COLUMNS} label="Plivo pools" className="blue-table" loading={pools.isLoading || showPoolSkeleton} skeleton={<TableSkeleton columns={POOL_COLUMNS} />}>
            {filtered.length === 0 ? (
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
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {new Date(p.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <IconButton label={`Edit ${p.name}`} className="h-8 w-8 p-1 [&>svg]:h-[18px] [&>svg]:w-[18px]" onClick={() => router.push(`/number-pool/pools/${p.id}/edit`)}>
                        <Pencil size={18} />
                      </IconButton>
                      <DeleteIconButton
                        disabled={remove.isPending && remove.variables === p.id}
                        onClick={() => handleDelete(p)}
                      />
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
