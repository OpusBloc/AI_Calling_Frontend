"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowDownUp, ArrowLeft, ArrowUp, Gauge, Megaphone, Phone } from "lucide-react";

import { useCampaigns, usePlivoNumberCallStats, usePlivoNumbers, usePlivoPool } from "@/hooks/hooks";
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

const NUMBER_PAGE_SIZE = 6;

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
  const router = useRouter();
  // Fetch the selected pool directly by ID when its row opens.
  const poolQuery = usePlivoPool(id);
  const numbers = usePlivoNumbers();
  const callStats = usePlivoNumberCallStats();
  const campaigns = useCampaigns();
  const [callCountOrder, setCallCountOrder] = useState<"normal" | "desc" | "asc">("normal");
  const [numberPage, setNumberPage] = useState(1);
  const showPoolSkeleton = useSkeletonVisibility(poolQuery.isLoading);
  const backButton = (
    <button
      type="button"
      aria-label="Back to Plivo pools"
      title="Back to Plivo pools"
      onClick={() => router.push("/number-pool")}
      className="btn-blue-filled mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ArrowLeft size={18} aria-hidden="true" />
    </button>
  );

  const pool = poolQuery.data;
  if (poolQuery.isLoading || showPoolSkeleton) return showPoolSkeleton ? <PoolDetailSkeleton /> : null;

  if (poolQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Plivo pool" leading={backButton} />
        <ErrorState
          message={(poolQuery.error as Error).message}
          onRetry={() => poolQuery.refetch()}
        />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pool not found" leading={backButton} />
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
  const numberPageCount = Math.max(1, Math.ceil(orderedPhones.length / NUMBER_PAGE_SIZE));
  const currentNumberPage = Math.min(numberPage, numberPageCount);
  const visiblePhones = orderedPhones.slice((currentNumberPage - 1) * NUMBER_PAGE_SIZE, currentNumberPage * NUMBER_PAGE_SIZE);
  const mobilePhoneItems = visiblePhones.map((phone) => {
    const number = details.get(phone);
    const location = number?.region && number.country && !number.region.toLowerCase().includes(number.country.toLowerCase())
      ? `${number.region}, ${number.country}`
      : number?.region || number?.country || "-";
    return {
      id: phone,
      avatar: "",
      hideAvatar: true,
      title: phone,
      subtitle: <span className="block pt-1">{number?.alias || "No alias"}</span>,
      badge: number && !number.active ? <Badge tone="warn">Inactive</Badge> : undefined,
      keyValue: {
        label: "Total calls",
        value: <span className="tnum">{(callCounts.get(phone) ?? 0).toLocaleString()}</span>,
      },
      details: [
        { label: "Type", value: number?.number_type ?? "-" },
        { label: "Location", value: location, fullWidth: true },
        {
          label: "Capabilities",
          value: number ? (
            <span className="flex flex-wrap gap-1">
              <Badge tone={number.voice_enabled ? "gain" : "neutral"}>{number.voice_enabled ? "Voice" : "No voice"}</Badge>
              {number.sms_enabled && <Badge tone="info">SMS</Badge>}
            </span>
          ) : "-",
        },
        { label: "Daily limit", value: number?.daily_attempt_limit ?? "-" },
        { label: "Concurrent calls", value: number?.max_concurrent_calls ?? "-" },
      ],
    };
  });
  const usedBy = (campaigns.data ?? []).filter((c) => c.plivo_pool_ids.includes(pool.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title={pool.name}
        leading={backButton}
        meta={<StatusBadge status={pool.status} />}
        description={`Created ${new Date(pool.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })} · Updated ${new Date(pool.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
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
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            title="Used by campaigns"
            icon={<Megaphone size={22} />}
            tone="green"
            value={usedBy.length}
            label={usedBy.length === 1 ? "campaign uses this pool" : "campaigns use this pool"}
            loading={campaigns.isLoading}
          />
        </div>
      </div>

      <Card flush title="Numbers" description="Plivo numbers in this pool. Calls are placed from these as the caller ID.">
        {pool.phone_numbers.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No numbers in this pool" text="This pool does not have any numbers yet." />
          </div>
        ) : (
          <>
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
          ]} label="Pool numbers" mobileItems={mobilePhoneItems}>
            {visiblePhones.map((phone) => {
              const n = details.get(phone);
              const location = n?.region && n.country && !n.region.toLowerCase().includes(n.country.toLowerCase())
                ? `${n.region}, ${n.country}`
                : n?.region || n?.country || "-";
              return (
                <tr key={phone}>
                  <td className="min-w-[190px] px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tnum whitespace-nowrap font-medium text-heading">{phone}</span>
                      {n && !n.active && <Badge tone="warn">Inactive</Badge>}
                    </div>
                    <p className="mt-2 max-w-[190px] truncate text-xs leading-4 text-muted" title={n?.alias ?? undefined}>
                      {n?.alias || "No alias"}
                    </p>
                  </td>
                  <td className="min-w-[145px] px-3 py-3">
                    <p className="capitalize text-body">{n?.number_type ?? "-"}</p>
                    <p className="mt-1 max-w-[160px] truncate text-xs text-muted" title={location}>{location}</p>
                  </td>
                  <td className="min-w-[100px] px-3 py-3">
                    {n ? (
                      <span className="flex flex-wrap gap-1">
                        <Badge tone={n.voice_enabled ? "gain" : "neutral"}>{n.voice_enabled ? "Voice" : "No voice"}</Badge>
                        {n.sms_enabled && <Badge tone="info">SMS</Badge>}
                      </span>
                    ) : (
                      <span className="text-faint">-</span>
                    )}
                  </td>
                  <td className="min-w-[110px] px-3 py-3">
                    <SkeletonBoundary loading={callStats.isLoading} skeleton={<PoolNumberCountSkeleton />}>
                    {callStats.isError ? (
                      <span className="text-xs text-muted">-</span>
                    ) : (
                      <span className="tnum text-sm font-medium text-heading">{(callCounts.get(phone) ?? 0).toLocaleString()}</span>
                    )}
                    </SkeletonBoundary>
                  </td>
                  <td className="min-w-[130px] px-3 py-3">
                    <p className="tnum text-sm font-medium text-heading">{n?.daily_attempt_limit ?? "-"} <span className="font-normal text-muted">daily</span></p>
                    <p className="tnum mt-1 text-xs text-muted">{n?.max_concurrent_calls ?? "-"} concurrent</p>
                  </td>
                </tr>
              );
            })}
          </Table>
          {orderedPhones.length > NUMBER_PAGE_SIZE && (
            <nav aria-label="Pool numbers pagination" className="flex items-center justify-center gap-3 border-t border-hairline px-4 py-3 text-sm">
              <button
                type="button"
                onClick={() => setNumberPage((page) => Math.max(1, page - 1))}
                disabled={currentNumberPage <= 1}
                className="btn-blue-filled inline-flex min-h-[40px] min-w-[96px] items-center justify-center rounded-md px-3 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="whitespace-nowrap font-medium text-heading" aria-live="polite">Page {currentNumberPage} of {numberPageCount}</span>
              <button
                type="button"
                onClick={() => setNumberPage((page) => Math.min(numberPageCount, page + 1))}
                disabled={currentNumberPage >= numberPageCount}
                className="btn-blue-filled inline-flex min-h-[40px] min-w-[96px] items-center justify-center rounded-md px-3 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
          </>
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
