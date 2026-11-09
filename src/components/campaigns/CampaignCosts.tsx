"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, IndianRupee, PhoneCall } from "lucide-react";

import { getCallCosts } from "@/lib/api";
import type {
  CampaignCallsSummary,
  ScheduledCampaignCall,
} from "@/types/types";
import CostSplit, { rupees } from "@/components/CostSplit";
import {
  Card,
  ErrorState,
  Pagination,
  SkeletonRows,
  StatTile,
  Table,
  TableMessage,
  formatDuration,
  usePagination,
} from "@/components/ui";

const RECENT_LIMIT = 500;

const HEAD = [
  "Lead",
  "Mobile number",
  "When",
  "Duration",
  "AI cost",
  "Plivo cost",
  "Total cost",
];

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="AI cost"
          value={v(rupees(aiCost, 2))}
          icon={<IndianRupee size={16} />}
          hint="STT, LLM, TTS and tax"
        />

        <StatTile
          label="Plivo billing"
          value={v(rupees(plivoBilling, 2))}
          icon={<PhoneCall size={16} />}
          hint="Total telephony charges"
        />

        <StatTile
          label="Total campaign cost"
          value={v(rupees(grandTotal, 2))}
          icon={<IndianRupee size={16} />}
          hint="AI cost + Plivo billing"
        />

        <StatTile
          label="Answered calls"
          value={v(answeredCalls)}
          icon={<PhoneCall size={16} />}
          hint="Successfully answered calls"
        />

        <StatTile
          label="AI talk time"
          value={v(formatDuration(talkTime))}
          icon={<Clock size={16} />}
          hint={`${summary?.total_talk_minutes ?? 0} minutes total`}
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
      />

      {/* Per-call costs */}
      <Card
        flush
        title="Cost per call"
        description="Newest first. AI costs include speech-to-text, model, and text-to-speech."
      >
        <div className="space-y-3 pb-3">
          <Table bare head={HEAD} label="Cost per call">
            {loading ? (
              <SkeletonRows rows={5} cols={HEAD.length} />
            ) : rows.length === 0 ? (
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