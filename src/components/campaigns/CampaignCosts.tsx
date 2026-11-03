"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, IndianRupee, PhoneCall } from "lucide-react";

import { getCallCosts } from "@/lib/api";
import type { ScheduledCampaignCall } from "@/types/types";
import CostSplit, { rupees } from "@/components/CostSplit";
import { Card, ErrorState, Pagination, SkeletonRows, StatTile, Table, TableMessage, formatDate, formatDuration, formatMoney, usePagination } from "@/components/ui";

// /call-costs can't filter by campaign, so take its largest page and match rows to this
// campaign's attempts. Calls older than the newest RECENT_LIMIT costed calls are missed.
const RECENT_LIMIT = 500;
const HEAD = ["Lead", "Mobile number", "When", "Duration", "AI cost", "Plivo cost", "Total cost"];

/**
 * AI cost (Sarvam STT / LLM / TTS) for one campaign's calls
 */
export default function CampaignCosts({ calls, callsLoading }: { calls: ScheduledCampaignCall[] | undefined; callsLoading: boolean }) {
  const costs = useQuery({
    queryKey: ["call-costs", "list", 1, RECENT_LIMIT],
    queryFn: () => getCallCosts(1, RECENT_LIMIT),
    retry: false,
  });

  // attempt id / Plivo call id → the lead and attempt it belongs to
  const owners = useMemo(() => {
    const map = new Map<string, { lead: string; phone: string; plivoCost: number | null }>();
    for (const call of calls ?? []) {
      for (const a of call.attempt_history ?? []) {
        const amount = a.total_amount == null ? null : Number(a.total_amount);
        const owner = {
          lead: call.lead_name || call.phone_e164,
          phone: call.phone_e164,
          plivoCost: amount !== null && Number.isFinite(amount) ? amount : null,
        };
        map.set(a.id, owner);
        if (a.plivo_call_uuid) map.set(a.plivo_call_uuid, owner);
      }
    }
    return map;
  }, [calls]);

  const rows = useMemo(
    () =>
      (costs.data?.items ?? [])
        .map((c) => {
          const owner = owners.get(c.attempt_id ?? "") ?? owners.get(c.call_uuid);
          const plivoCost = owner?.plivoCost;
          return {
            ...c,
            owner,
            plivoCost,
            combinedCost: plivoCost == null ? null : plivoCost + c.total_cost,
          };
        })
        .filter((c) => c.owner),
    [costs.data, owners],
  );
  const pagination = usePagination(rows, 25);

  const totals = rows.reduce(
    (t, c) => ({ stt: t.stt + c.stt_cost, llm: t.llm + c.llm_cost, tts: t.tts + c.tts_cost, total: t.total + c.total_cost, seconds: t.seconds + c.duration_seconds }),
    { stt: 0, llm: 0, tts: 0, total: 0, seconds: 0 },
  );
  const loading = costs.isLoading || callsLoading;
  const v = (n: React.ReactNode) => (loading ? "—" : n);
  const capped = (costs.data?.total ?? 0) > RECENT_LIMIT;

  if (costs.isError) {
    return <ErrorState title="Couldn't load call costs" message={(costs.error as Error).message} onRetry={() => costs.refetch()} />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="AI cost"
          value={v(rupees(totals.total))}
          icon={<IndianRupee size={16} />}
          hint="Speech-to-text, AI model and voice, before GST"
        />
        <StatTile
          label="Costed calls"
          value={v(rows.length)}
          icon={<PhoneCall size={16} />}
          hint={rows.length ? `${rupees(totals.total / rows.length, 3)} per call on average` : undefined}
        />
        <StatTile
          label="AI talk time"
          value={v(formatDuration(totals.seconds))}
          icon={<Clock size={16} />}
          hint={rows.length ? `${formatDuration(totals.seconds / rows.length)} per call on average` : undefined}
        />
      </div>

      <CostSplit loading={loading} parts={rows.length ? totals : undefined} description="Share of this campaign's AI spend." />

      <Card flush title="Cost per call" description="Newest first. AI costs include speech-to-text, model, and text-to-speech.">
        <div className="space-y-3 pb-3">
          <Table bare head={HEAD} label="Cost per call">
            {loading ? (
              <SkeletonRows rows={5} cols={HEAD.length} />
            ) : rows.length === 0 ? (
              <TableMessage cols={HEAD.length}>No calls in this campaign have been costed yet. Costs appear once a call ends.</TableMessage>
            ) : (
              pagination.pageItems.map((c) => (
                <tr key={c.call_uuid}>
                  <td className="px-4 py-3 font-medium text-heading">{c.owner!.lead}</td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">{c.owner!.phone || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(c.started_at ?? c.created_at)}</td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">{formatDuration(c.duration_seconds)}</td>
                  <td className="tnum px-4 py-3 text-body">{rupees(c.total_cost, 3)}</td>
                  <td className="tnum px-4 py-3 text-body">{c.plivoCost == null ? "—" : formatMoney(c.plivoCost, 4)}</td>
                  <td className="tnum px-4 py-3 font-semibold text-heading">{c.combinedCost == null ? "—" : formatMoney(c.combinedCost, 4)}</td>
                </tr>
              ))
            )}
          </Table>
          <div className="px-4">
            <Pagination {...pagination} noun="calls" />
            {capped && (
              <p className="mt-2 text-xs text-muted">
                Based on the latest {RECENT_LIMIT} costed calls across all campaigns; older calls from this campaign aren&apos;t included.
              </p>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
