"use client";

import { useParams, useRouter } from "next/navigation";
import { Gauge, Megaphone, Pencil, Phone, Trash2 } from "lucide-react";

import { useCampaigns, useDeletePlivoPool, usePlivoNumbers, usePlivoPool, usePlivoPools } from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import { deletePoolMessage } from "@/components/number-pool/pools-tab";
import {
  Badge,
  Button,
  Card,
  ChipList,
  EmptyState,
  ErrorState,
  Loading,
  Skeleton,
  StatTile,
  StatusBadge,
  Table,
  formatDate,
} from "@/components/ui";

const HEAD = ["Number", "Alias", "Type", "Location", "Capabilities", "Daily limit", "Max concurrent"];

export default function PlivoPoolPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Confirm the ID exists via the list so a bad link reads "not found", not an error
  const pools = usePlivoPools();
  const exists = pools.data?.some((p) => p.id === id) ?? false;
  const poolQuery = usePlivoPool(exists ? id : "");
  const numbers = usePlivoNumbers();
  const campaigns = useCampaigns();
  const remove = useDeletePlivoPool();

  const pool = poolQuery.data ?? pools.data?.find((p) => p.id === id);
  const crumbs = [{ label: "Number Pool", href: "/number-pool" }, { label: pool?.name ?? "Plivo pool" }];

  if (pools.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title={<Skeleton className="h-8 w-56" />} />
        <Loading label="Loading pool" />
      </div>
    );
  }

  if (pools.isError || poolQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title="Plivo pool" />
        <ErrorState
          message={((pools.error ?? poolQuery.error) as Error).message}
          onRetry={() => (pools.isError ? pools.refetch() : poolQuery.refetch())}
        />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title="Pool not found" />
        <EmptyState
          title="This pool doesn't exist"
          text="It may have been deleted, or the link is wrong."
          action={<Button onClick={() => router.push("/number-pool")}>Back to pools</Button>}
        />
      </div>
    );
  }

  const details = new Map((numbers.data ?? []).map((n) => [n.phone_e164, n]));
  const usedBy = (campaigns.data ?? []).filter((c) => c.plivo_pool_ids.includes(pool.id));

  const handleDelete = async () => {
    const ok = await confirmDialog({ title: "Delete Plivo pool?", message: deletePoolMessage(pool.name), confirmLabel: "Delete pool" });
    if (!ok) return;
    remove.mutate(pool.id, {
      onSuccess: () => {
        showSuccessNotification(`"${pool.name}" was deleted.`, { title: "Pool deleted" });
        router.replace("/number-pool");
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={crumbs}
        title={pool.name}
        meta={<StatusBadge status={pool.status} />}
        description={`Created ${formatDate(pool.created_at)} · Updated ${formatDate(pool.updated_at)}`}
        actions={
          <>
            <Button variant="secondary" onClick={handleDelete} loading={remove.isPending} className="text-loss">
              <Trash2 size={16} aria-hidden /> Delete
            </Button>
            <Button onClick={() => router.push(`/number-pool/pools/${pool.id}/edit`)}>
              <Pencil size={16} aria-hidden /> Edit pool
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Numbers" value={pool.phone_numbers.length} icon={<Phone size={16} />} />
        <StatTile label="Concurrency limit" value={pool.concurrency_limit} icon={<Gauge size={16} />} hint="Calls this pool can carry at once" />
        <StatTile label="Used by campaigns" value={campaigns.isLoading ? "—" : usedBy.length} icon={<Megaphone size={16} />} />
      </div>

      <Card flush title="Numbers" description="Plivo numbers in this pool. Calls are placed from these as the caller ID.">
        {pool.phone_numbers.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No numbers in this pool" text="Edit the pool to add numbers." action={<Button onClick={() => router.push(`/number-pool/pools/${pool.id}/edit`)}>Add numbers</Button>} />
          </div>
        ) : (
          <Table bare head={HEAD} label="Pool numbers">
            {pool.phone_numbers.map((phone) => {
              const n = details.get(phone);
              return (
                <tr key={phone}>
                  <td className="tnum whitespace-nowrap px-4 py-3 font-medium text-heading">
                    {phone}
                    {n && !n.active && (
                      <span className="ml-2">
                        <Badge tone="warn">Inactive</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-body">{n?.alias || <span className="text-faint">—</span>}</td>
                  <td className="px-4 py-3 capitalize text-body">{n?.number_type ?? "—"}</td>
                  <td className="px-4 py-3 text-body">{[n?.region, n?.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    {n ? (
                      <span className="flex gap-1">
                        <Badge tone={n.voice_enabled ? "gain" : "neutral"}>{n.voice_enabled ? "Voice" : "No voice"}</Badge>
                        {n.sms_enabled && <Badge tone="info">SMS</Badge>}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="tnum px-4 py-3 text-body">{n?.daily_attempt_limit ?? "—"}</td>
                  <td className="tnum px-4 py-3 text-body">{n?.max_concurrent_calls ?? "—"}</td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Card title="Used by campaigns">
        <ChipList
          empty="No campaign uses this pool yet."
          items={usedBy.map((c) => ({ key: c.id, label: c.name, href: `/campaigns/${c.id}` }))}
        />
      </Card>

    </div>
  );
}
