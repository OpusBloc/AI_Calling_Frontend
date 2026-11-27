"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowDownUp, ArrowUp, Clock, IndianRupee, PhoneCall } from "lucide-react";

import { getCallCosts } from "@/lib/api";
import type {
  CampaignCallsSummary,
  ScheduledCampaignCall,
} from "@/types/types";
import CostSplit, { rupees, type CostTrendPoint } from "@/components/CostSplit";
import SelectMenu from "@/components/SelectMenu";
import StatCard from "@/features/dashboard/components/StatCard";
import {
  Card,
  ErrorState,
  Table,
  TableMessage,
  formatDuration,
} from "@/components/ui";
import { TableSkeleton } from "@/components/skeletons";
import { COST_CALL_COLUMNS } from "@/components/skeletons/table-columns";
import { PAGE_SIZE } from "@/lib/constants";

const RECENT_LIMIT = 500;

const HEAD = COST_CALL_COLUMNS.map((column) => column.label);
type CostSortKey = "duration" | "ai" | "plivo" | "total";

const toNum = (value: unknown): number | undefined => {
  const number = Number(value);

  return value != null && value !== "" && Number.isFinite(number)
    ? number
    : undefined;
};

function CostSortHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc" | null;
  ariaSort: "ascending" | "descending" | "none";
  onClick: () => void;
}) {
  const SortIcon = !active ? ArrowDownUp : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      aria-label={`Sort by ${label}: ${!active ? "normal" : dir === "asc" ? "low to high" : "high to low"}`}
      onClick={onClick}
      className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium tracking-[0.08em] text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span>{label}</span>
      <SortIcon size={16} aria-hidden className="text-blue-600 dark:text-blue-400" />
    </button>
  );
}

export default function CampaignCosts({
  calls,
  summary,
  callsLoading,
  totalPlivoBilling,
  billingLoading,
}: {
  calls: ScheduledCampaignCall[] | undefined;
  summary?: CampaignCallsSummary;
  callsLoading: boolean;
  totalAiCost?: number;
  totalPlivoBilling?: number | string;
  billingLoading: boolean;
}) {
  const costs = useQuery({
    queryKey: ["call-costs", "list", 1, RECENT_LIMIT],
    queryFn: () => getCallCosts(1, RECENT_LIMIT),
    retry: false,
  });
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: CostSortKey; dir: "asc" | "desc" } | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const updatePageSize = () => {
      setPageSize(media.matches ? 10 : PAGE_SIZE);
      setPage(1);
    };
    updatePageSize();
    media.addEventListener("change", updatePageSize);
    return () => media.removeEventListener("change", updatePageSize);
  }, []);

  const owners = useMemo(() => {
    const map = new Map<
      string,
      { lead: string; phone: string; plivoCost: number | null }
    >();

    for (const call of calls ?? []) {
      for (const attempt of call.attempt_history ?? []) {
        const amount =
          attempt.total_amount == null ? null : Number(attempt.total_amount);

        const owner = {
          lead: call.lead_name || call.phone_e164,
          phone: call.phone_e164,
          plivoCost:
            amount !== null && Number.isFinite(amount) ? amount : null,
        };

        map.set(attempt.id, owner);

        if (attempt.plivo_call_uuid) {
          map.set(attempt.plivo_call_uuid, owner);
        }
      }
    }

    return map;
  }, [calls]);

  const rows = useMemo(
    () =>
      (costs.data?.items ?? [])
        .map((cost) => {
          const owner =
            owners.get(cost.attempt_id ?? "") ?? owners.get(cost.call_uuid);

          const plivoCost = owner?.plivoCost;

          return {
            ...cost,
            owner,
            plivoCost,
            combinedCost:
              plivoCost == null ? null : plivoCost + cost.total_cost,
          };
        })
        .filter((cost) => cost.owner),
    [costs.data, owners],
  );

  const trend = useMemo<CostTrendPoint[]>(() => {
    const daily = new Map<string, number>();
    for (const cost of rows) {
      const timestamp = cost.started_at ?? cost.created_at;
      const parsed = new Date(timestamp);
      if (Number.isNaN(parsed.getTime())) continue;
      const day = parsed.toISOString().slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + (cost.combinedCost ?? cost.total_cost));
    }

    return [...daily]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, cost]) => ({
        date: new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        cost,
      }));
  }, [rows]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const value = (cost: (typeof rows)[number]): number | null | undefined => {
      switch (sort.key) {
        case "duration": return cost.duration_seconds;
        case "ai": return cost.total_cost;
        case "plivo": return cost.plivoCost;
        case "total": return cost.combinedCost;
      }
    };
    return [...rows].sort((a, b) => {
      const first = value(a);
      const second = value(b);
      if (first == null) return second == null ? 0 : 1;
      if (second == null) return -1;
      return sort.dir === "asc" ? first - second : second - first;
    });
  }, [rows, sort]);

  const toggleSort = (key: CostSortKey) => {
    setPage(1);
    setSort((current) => current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null);
  };

  const head = HEAD.map((label, index) => {
    const key: CostSortKey | null = index === 3 ? "duration" : index === 4 ? "ai" : index === 5 ? "plivo" : index === 6 ? "total" : null;
    if (!key) return label;
    const dir = sort?.key === key ? sort.dir : null;
    const active = dir !== null;
    return (
      <CostSortHead
        key={label}
        label={label}
        active={active}
        dir={dir}
        ariaSort={dir ? (dir === "asc" ? "ascending" : "descending") : "none"}
        onClick={() => toggleSort(key)}
      />
    );
  });

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageItems = sortedRows.slice(start, start + pageSize);

  const mobileItems = pageItems.map((cost) => {
    const totalCost = cost.combinedCost == null ? "-" : rupees(cost.combinedCost, 2);
    const avatarSource = cost.owner!.lead?.trim() || cost.owner!.phone;
    return {
      id: cost.call_uuid,
      avatar: avatarSource.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
      title: cost.owner!.lead || "Unnamed lead",
      subtitle: cost.owner!.phone || "-",
      keyValue: {
        label: "Total cost",
        value: <span className="tnum font-semibold">{totalCost}</span>,
        subValue: formatDuration(cost.duration_seconds),
      },
      details: [
        { label: "When", value: new Date(cost.started_at ?? cost.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" }), fullWidth: true },
        { label: "Duration", value: formatDuration(cost.duration_seconds) },
        { label: "AI cost", value: rupees(cost.total_cost, 2) },
        { label: "Plivo cost", value: cost.plivoCost == null ? "-" : rupees(cost.plivoCost, 2) },
        { label: "Total cost", value: totalCost },
      ],
    };
  });

  const loading = costs.isLoading || callsLoading || billingLoading;

  const v = (value: React.ReactNode) => (loading ? "-" : value);

  // Use the API summary values directly.
  const aiCosts = summary?.ai_costs;

  const sttCost = toNum(aiCosts?.stt_cost_inr) ?? 0;
  const ttsCost = toNum(aiCosts?.tts_cost_inr) ?? 0;

  const llmCost = Object.values(aiCosts?.llm_cost_by_provider ?? {}).reduce(
    (total, provider) => {
      // Only INR amounts can be added to the rupee breakdown.
      if (provider.currency !== "INR") return total;
      return total + (toNum(provider.amount) ?? 0);
    },
    0,
  );

  const aiCost = toNum(aiCosts?.total_cost_inr_including_tax) ?? 0;

  const plivoBilling =
    toNum(summary?.total_plivo_cost_inr) ?? toNum(totalPlivoBilling) ?? 0;

  const grandTotal = aiCost + plivoBilling;

  const answeredCalls = summary?.answered_calls ?? 0;
  const talkTime = summary?.total_talk_seconds ?? 0;

  const capped = (costs.data?.total ?? 0) > RECENT_LIMIT;

  if (costs.isError) {
    return (
      <ErrorState
        title="Couldn't load call costs"
        message={(costs.error as Error).message}
        onRetry={() => costs.refetch()}
      />
    );
  }

  return (
    <>
      {/* Campaign cost summary */}
      <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="AI cost"
          value={v(rupees(aiCost, 2))}
          icon={<IndianRupee />}
          color="teal"
          loading={loading}
          subtext="STT, LLM, TTS and tax"
        />

        <StatCard
          title="Plivo billing"
          value={v(rupees(plivoBilling, 2))}
          icon={<PhoneCall />}
          color="amber"
          loading={loading}
          subtext="Total telephony charges"
        />

        <StatCard
          title="Total campaign cost"
          value={v(rupees(grandTotal, 2))}
          icon={<IndianRupee />}
          color="sky"
          loading={loading}
          subtext="AI cost + Plivo billing"
        />

        <StatCard
          title="Answered calls"
          value={v(answeredCalls)}
          icon={<PhoneCall />}
          color="emerald"
          loading={loading}
          subtext="Successfully answered calls"
        />

        <div className="col-span-2 min-w-0 md:col-span-1">
          <StatCard
            title="AI talk time"
            value={v(formatDuration(talkTime))}
            icon={<Clock />}
            color="violet"
            loading={loading}
            subtext={`${summary?.total_talk_minutes ?? 0} minutes total`}
          />
        </div>
      </div>

      {/* AI + Plivo cost breakdown */}
      <CostSplit
        loading={loading}
        parts={{
          stt: sttCost,
          llm: llmCost,
          tts: ttsCost,
          aiTotal: aiCost,
        }}
        plivoBilling={plivoBilling}
        description="Breakdown of this campaign's AI and telephony spending."
        trend={trend}
        trendLoading={loading}
      />

      {/* Per-call costs */}
      <Card
        flush
        allowOverflow
        className="blue-fields"
        title="Cost per call"
        description="Newest first. AI costs include speech-to-text, model, and text-to-speech."
      >
        <div className="space-y-1">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:hidden">
            <SelectMenu
              label="Sort by"
              value={sort?.key ?? "newest"}
              onChange={(value) => {
                setPage(1);
                setSort(value === "newest" ? null : { key: value as CostSortKey, dir: sort?.dir ?? "asc" });
              }}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "duration", label: "Duration" },
                { value: "ai", label: "AI cost" },
                { value: "plivo", label: "Plivo cost" },
                { value: "total", label: "Total cost" },
              ]}
              className="w-full"
              showNativeSelect={false}
            />
            <button
              type="button"
              aria-label={sort?.dir === "desc" ? "Sort ascending" : "Sort descending"}
              title={sort?.dir === "desc" ? "Sort ascending" : "Sort descending"}
              onClick={() => {
                setPage(1);
                setSort((current) => current
                  ? { ...current, dir: current.dir === "asc" ? "desc" : "asc" }
                  : { key: "duration", dir: "asc" });
              }}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-hairline-strong bg-surface-input text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:text-blue-400"
            >
              {sort?.dir === "desc" ? <ArrowDown size={18} aria-hidden /> : <ArrowUp size={18} aria-hidden />}
            </button>
          </div>
          <Table bare head={head} headClassNames={["", "hidden lg:table-cell"]} columnClassNames={["", "hidden lg:table-column"]} columns={COST_CALL_COLUMNS} label="Cost per call" className="blue-table" loading={loading} skeleton={<TableSkeleton columns={COST_CALL_COLUMNS} />} mobileItems={mobileItems} mobileListDense>
            {rows.length === 0 ? (
              <TableMessage cols={HEAD.length}>
                No calls in this campaign have been costed yet. Costs appear
                once a call ends.
              </TableMessage>
            ) : (
              pageItems.map((cost) => {
                const callDate = new Date(cost.started_at ?? cost.created_at);
                return (
                  <tr key={cost.call_uuid}>
                    <td className="max-w-xs min-w-0 px-4 py-2 font-medium text-heading">
                      <span className="block truncate">{cost.owner!.lead}</span>
                      <span className="hidden break-all text-xs font-normal text-muted md:block lg:hidden">{cost.owner!.phone || "-"}</span>
                    </td>

                    <td className="tnum hidden whitespace-nowrap px-4 py-2 text-body lg:table-cell">
                      {cost.owner!.phone || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-2 text-muted">
                      <span className="hidden md:inline lg:hidden">{callDate.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      <span className="hidden lg:inline">{callDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}</span>
                    </td>

                    <td className="tnum whitespace-nowrap px-4 py-2 text-body">
                      {formatDuration(cost.duration_seconds)}
                    </td>

                    <td className="tnum px-4 py-2 text-body">
                      {rupees(cost.total_cost, 2)}
                    </td>

                    <td className="tnum px-4 py-2 text-body">
                      {cost.plivoCost == null ? "-" : rupees(cost.plivoCost, 2)}
                    </td>

                    <td className="tnum px-4 py-2 font-semibold text-heading">
                      {cost.combinedCost == null ? "-" : rupees(cost.combinedCost, 2)}
                    </td>
                  </tr>
                );
              })
            )}
          </Table>

          <div className="flex flex-col gap-2 px-1 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-blue-600 dark:text-blue-400" aria-live="polite">
                Showing {rows.length === 0 ? 0 : start + 1}-{Math.min(start + pageSize, rows.length)} of {rows.length} calls
              </p>
              {capped && (
                <p className="text-xs text-muted">
                  Based on the latest {RECENT_LIMIT} costed calls across all
                  campaigns; older calls from this campaign aren&apos;t included.
                </p>
              )}
            </div>
            {rows.length > pageSize && (
              <nav aria-label="Cost calls pagination" className="flex items-center gap-2 md:flex-none">
                <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="btn-blue-filled inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 md:w-24 md:flex-none md:px-2">Previous</button>
                <span className="shrink-0 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400" aria-live="polite">Page {currentPage} of {pageCount}</span>
                <button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className="btn-blue-filled inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 md:w-24 md:flex-none md:px-2">Next</button>
              </nav>
            )}

          </div>
        </div>
      </Card>
    </>
  );
}
