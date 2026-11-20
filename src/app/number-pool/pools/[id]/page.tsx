"use client";

import { useParams } from "next/navigation";
import { ArrowDown, ArrowDownUp, ArrowUp, Gauge, Megaphone, Phone } from "lucide-react";

import { useCampaigns, usePlivoNumberCallStats, usePlivoNumbers, usePlivoPool, usePlivoPools } from "@/hooks/hooks";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/features/dashboard/components/StatCard";
import {
  Badge,
  Card,
  ChipList,
  EmptyState,
  ErrorState,
  StatusBadge,
  Table,
} from "@/components/ui";
import { PoolDetailSkeleton, PoolNumberCountSkeleton, SkeletonBoundary, useSkeletonVisibility } from "@/components/skeletons";
import { useState } from "react";

function CallCountSortHeader({
  order,
  onClick,
}: {
  order: "normal" | "desc" | "asc";
  ariaSort: "none" | "ascending" | "descending";
  onClick: () => void;
}) {
  const SortIcon = order === "normal" ? ArrowDownUp : order === "desc" ? ArrowDown : ArrowUp;
  return (
    <button
      type="button"
      aria-label="Sort total calls: normal, high to low, low to high"
      title={`Total calls: ${order === "normal" ? "normal order" : order === "desc" ? "high to low" : "low to high"}`}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      Total calls <SortIcon size={13} aria-hidden />
    </button>
  );
}

export default function PlivoPoolPage() {
  const { id } = useParams<{ id: string }>();
  // Confirm the ID exists via the list so a bad link reads "not found", not an error
  const pools = usePlivoPools();
  const exists = pools.data?.some((p) => p.id === id) ?? false;
  const poolQuery = usePlivoPool(exists ? id : "");
  const numbers = usePlivoNumbers();
  const callStats = usePlivoNumberCallStats();
  const campaigns = useCampaigns();
  const [callCountOrder, setCallCountOrder] = useState<"normal" | "desc" | "asc">("normal");
  const showPoolSkeleton = useSkeletonVisibility(pools.isLoading);

  const pool = poolQuery.data ?? pools.data?.find((p) => p.id === id);
  if (pools.isLoading || showPoolSkeleton) return showPoolSkeleton ? <PoolDetailSkeleton /> : null;

  if (pools.isError || poolQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Plivo pool" />
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
        <PageHeader title="Pool not found" />
        <EmptyState
          title="This pool doesn't exist"
          text="It may have been deleted, or the link is wrong."
        />
      </div>
    );
  }

  const details = new Map((numbers.data ?? []).map((n) => [n.phone_e164, n]));
  const callCounts = new Map((callStats.data ?? []).map((stat) => [stat.phone_e164, stat.total_calls]));
  const orderedPhones = [...pool.phone_numbers].sort((a, b) => {
    if (callCountOrder === "normal") return 0;
    const difference = (callCounts.get(a) ?? 0) - (callCounts.get(b) ?? 0);
    return callCountOrder === "desc" ? -difference : difference;
  });
  const usedBy = (campaigns.data ?? []).filter((c) => c.plivo_pool_ids.includes(pool.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title={pool.name}
        meta={<StatusBadge status={pool.status} />}
        description={`Created ${new Date(pool.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })} · Updated ${new Date(pool.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}`}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Numbers"
          icon={<Phone size={22} />}
          tone="purple"
          value={pool.phone_numbers.length}
          label={pool.phone_numbers.length === 1 ? "number in this pool" : "numbers in this pool"}
        />
        <StatCard
          title="Concurrency limit"
          icon={<Gauge size={22} />}
          tone="blue"
          value={pool.concurrency_limit}
          label="calls this pool can carry at once"
        />
        <StatCard
          title="Used by campaigns"
          icon={<Megaphone size={22} />}
          tone="green"
          value={usedBy.length}
          label={usedBy.length === 1 ? "campaign uses this pool" : "campaigns use this pool"}
          loading={campaigns.isLoading}
        />
      </div>

      <Card flush title="Numbers" description="Plivo numbers in this pool. Calls are placed from these as the caller ID.">
        {pool.phone_numbers.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No numbers in this pool" text="This pool does not have any numbers yet." />
          </div>
        ) : (
          <Table bare className="blue-table" head={[
            "Plivo number",
            "Type and location",
            "Capabilities",
            <CallCountSortHeader
              key="total-calls-sort"
              ariaSort={callCountOrder === "normal" ? "none" : callCountOrder === "desc" ? "descending" : "ascending"}
              order={callCountOrder}
              onClick={() => setCallCountOrder((order) => order === "normal" ? "desc" : order === "desc" ? "asc" : "normal")}
            />,
            "Limits",
          ]} label="Pool numbers">
            {orderedPhones.map((phone) => {
              const n = details.get(phone);
              const location = n?.region && n.country && !n.region.toLowerCase().includes(n.country.toLowerCase())
                ? `${n.region}, ${n.country}`
                : n?.region || n?.country || "—";
              return (
                <tr key={phone}>
                  <td className="min-w-[190px] px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tnum whitespace-nowrap font-medium text-heading">{phone}</span>
                      {n && !n.active && <Badge tone="warn">Inactive</Badge>}
                    </div>
                    <p className="mt-1 max-w-[190px] truncate text-xs text-muted" title={n?.alias ?? undefined}>
                      {n?.alias || "No alias"}
                    </p>
                  </td>
                  <td className="min-w-[145px] px-3 py-3">
                    <p className="capitalize text-body">{n?.number_type ?? "—"}</p>
                    <p className="mt-1 max-w-[160px] truncate text-xs text-muted" title={location}>{location}</p>
                  </td>
                  <td className="min-w-[100px] px-3 py-3">
                    {n ? (
                      <span className="flex flex-wrap gap-1">
                        <Badge tone={n.voice_enabled ? "gain" : "neutral"}>{n.voice_enabled ? "Voice" : "No voice"}</Badge>
                        {n.sms_enabled && <Badge tone="info">SMS</Badge>}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="min-w-[110px] px-3 py-3">
                    <SkeletonBoundary loading={callStats.isLoading} skeleton={<PoolNumberCountSkeleton />}>
                    {callStats.isError ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <span className="tnum text-sm font-medium text-heading">{(callCounts.get(phone) ?? 0).toLocaleString()}</span>
                    )}
                    </SkeletonBoundary>
                  </td>
                  <td className="min-w-[130px] px-3 py-3">
                    <p className="tnum text-sm font-medium text-heading">{n?.daily_attempt_limit ?? "—"} <span className="font-normal text-muted">daily</span></p>
                    <p className="tnum mt-1 text-xs text-muted">{n?.max_concurrent_calls ?? "—"} concurrent</p>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
        {callStats.isError && (
          <div className="p-4">
            <ErrorState
              title="Couldn't load number call stats"
              message={(callStats.error as Error).message}
              onRetry={() => void callStats.refetch()}
            />
          </div>
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
