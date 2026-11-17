"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, IndianRupee, PhoneCall } from "lucide-react";

import { getCallCosts } from "@/lib/api";
import type {
  CampaignCallsSummary,
  ScheduledCampaignCall,
} from "@/types/types";
import CostSplit, { rupees, type CostTrendPoint } from "@/components/CostSplit";
import StatCard from "@/features/dashboard/components/StatCard";
import {
  Card,
  ErrorState,
  Pagination,
  Table,
  TableMessage,
  formatDuration,
  usePagination,
} from "@/components/ui";
import { TableSkeleton } from "@/components/skeletons";
import { COST_CALL_COLUMNS } from "@/components/skeletons/table-columns";

const RECENT_LIMIT = 500;

const HEAD = COST_CALL_COLUMNS.map((column) => column.label);

const toNum = (value: unknown): number | undefined => {
  const number = Number(value);

  return value != null && value !== "" && Number.isFinite(number)
    ? number
    : undefined;
};

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

  const pagination = usePagination(rows, 25);

  const loading = costs.isLoading || callsLoading || billingLoading;

  const v = (value: React.ReactNode) => (loading ? "—" : value);

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

        <StatCard
          title="AI talk time"
          value={v(formatDuration(talkTime))}
          icon={<Clock />}
          color="violet"
          loading={loading}
          subtext={`${summary?.total_talk_minutes ?? 0} minutes total`}
        />
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
        title="Cost per call"
        description="Newest first. AI costs include speech-to-text, model, and text-to-speech."
      >
        <div className="space-y-3 pb-3">
          <Table bare head={HEAD} columns={COST_CALL_COLUMNS} label="Cost per call" className="blue-table" loading={loading} skeleton={<TableSkeleton columns={COST_CALL_COLUMNS} />}>
            {rows.length === 0 ? (
              <TableMessage cols={HEAD.length}>
                No calls in this campaign have been costed yet. Costs appear
                once a call ends.
              </TableMessage>
            ) : (
              pagination.pageItems.map((cost) => (
                <tr key={cost.call_uuid}>
                  <td className="px-4 py-3 font-medium text-heading">
                    {cost.owner!.lead}
                  </td>

                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">
                    {cost.owner!.phone || "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {new Date(
                      cost.started_at ?? cost.created_at,
                    ).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "medium",
                    })}
                  </td>

                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">
                    {formatDuration(cost.duration_seconds)}
                  </td>

                  <td className="tnum px-4 py-3 text-body">
                    {rupees(cost.total_cost, 2)}
                  </td>

                  <td className="tnum px-4 py-3 text-body">
                    {cost.plivoCost == null ? "—" : rupees(cost.plivoCost, 2)}
                  </td>

                  <td className="tnum px-4 py-3 font-semibold text-heading">
                    {cost.combinedCost == null
                      ? "—"
                      : rupees(cost.combinedCost, 2)}
                  </td>
                </tr>
              ))
            )}
          </Table>

          <div className="px-4">
            <Pagination {...pagination} noun="calls" />

            {capped && (
              <p className="mt-2 text-xs text-muted">
                Based on the latest {RECENT_LIMIT} costed calls across all
                campaigns; older calls from this campaign aren&apos;t included.
              </p>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
