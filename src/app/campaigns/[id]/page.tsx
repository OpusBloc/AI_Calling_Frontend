"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/calling-agent/ui";
import { showSuccessNotification } from "@/hooks/useNotification";
import { useCampaign, useCampaignCalls, useCampaignIds, usePostCampaignCallOutcome, useScheduleCampaign } from "@/hooks/hooks";
import type { CallOutcome } from "@/types/types";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const formatTime = (value?: string | null) => value ? value.slice(0, 5) : "—";

export default function CampaignDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const idsQuery = useCampaignIds();
  const campaignIdExists = idsQuery.data?.includes(id) ?? false;
  const campaignQuery = useCampaign(id, idsQuery.isSuccess && campaignIdExists);
  const callsQuery = useCampaignCalls(id, campaignQuery.isSuccess);
  const schedule = useScheduleCampaign();
  const postOutcome = usePostCampaignCallOutcome();
  const [callOutcomes, setCallOutcomes] = useState<Record<string, CallOutcome | "">>({});
  const campaign = campaignQuery.data;

  const details: Array<[string, string]> = campaign ? [
    ["Campaign ID", campaign.id],
    ["Status", campaign.status],
    ["Calling Agent ID", campaign.agent_id],
    ["Transfer Timeout", `${campaign.transfer_timeout_seconds} seconds`],
    ["Start At", formatDate(campaign.start_at)],
    ["Window Start", formatTime(campaign.window_start)],
    ["Window End", formatTime(campaign.window_end)],
    ["Timezone", campaign.timezone],
    ["Retry Interval", `${campaign.retry_interval_minutes} minutes`],
    ["Retry Count", String(campaign.retry_count)],
    ["Concurrency Limit", String(campaign.concurrency_limit)],
    ["Created At", formatDate(campaign.created_at)],
    ["Updated At", formatDate(campaign.updated_at)],
    ["Representatives", campaign.representative_ids.join(", ") || "None"],
    ["Lead Pools", campaign.lead_pool_ids.join(", ") || "None"],
    ["Plivo Numbers", campaign.plivo_numbers.join(", ") || "None"],
    ["Plivo Number Pools", campaign.plivo_pool_ids.join(", ") || "None"],
    ["Retry On", campaign.retry_on.join(", ") || "None"],
  ] : [];

  return (
    <div className="space-y-6 px-6 py-4">
      <PageHeader
        title={campaign?.name ?? "Campaign details"}
        description="Campaign information loaded by its ID."
        actions={<div className="flex items-center gap-2">{campaign && <Button onClick={() => schedule.mutate(id, { onSuccess: (result) => showSuccessNotification(`${result.created_calls} calls scheduled.`, { title: "Campaign scheduled" }) })} disabled={schedule.isPending}>{schedule.isPending ? "Scheduling..." : "Schedule Campaign"}</Button>}<button type="button" onClick={() => router.push("/campaigns")} className="rounded-md border border-hairline px-4 py-2 text-sm text-body transition-colors hover:bg-surface-hover">Back to campaigns</button></div>}
      />
      <section className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
        {(idsQuery.isLoading || (campaignIdExists && campaignQuery.isLoading)) && <p className="text-sm text-muted">Loading campaign...</p>}
        {idsQuery.isError && <p className="text-sm text-loss">Failed to load campaign IDs: {(idsQuery.error as Error).message}</p>}
        {idsQuery.isSuccess && !campaignIdExists && <p className="text-sm text-muted">Campaign not found.</p>}
        {campaignQuery.isError && <p className="text-sm text-loss">Failed to load campaign: {(campaignQuery.error as Error).message}</p>}
        {schedule.isError && <p className="mb-4 text-sm text-loss">Failed to schedule campaign: {(schedule.error as Error).message}</p>}
        {campaign && (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="min-w-0 px-3 py-2">
                <dt className="text-sm font-medium text-muted">{label}</dt>
                <dd className="mt-1 break-all text-sm text-heading">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      {schedule.data && (
        <section className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold text-heading">Schedule result</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[["Scheduled At", formatDate(schedule.data.scheduled_at)], ["Eligible Leads", String(schedule.data.eligible_leads)], ["Calls Created", String(schedule.data.created_calls)], ["Already Scheduled", String(schedule.data.already_scheduled)], ["Skipped Do Not Call", String(schedule.data.skipped_do_not_call)]].map(([label, value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="mt-1 font-medium text-heading">{value}</dd></div>)}
          </dl>
        </section>
      )}
      {campaign && (
        <section className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm">
          <div className="border-b border-hairline px-5 py-4"><h2 className="text-base font-semibold text-heading">Campaign calls</h2></div>
          {callsQuery.isLoading && <p className="p-5 text-sm text-muted">Loading campaign calls...</p>}
          {callsQuery.isError && <p className="p-5 text-sm text-loss">Failed to load campaign calls: {(callsQuery.error as Error).message}</p>}
          {postOutcome.isError && <p className="px-5 pb-3 text-sm text-loss">Failed to save call outcome: {(postOutcome.error as Error).message}</p>}
          {callsQuery.isSuccess && callsQuery.data.length === 0 && <p className="p-5 text-sm text-muted">No calls scheduled for this campaign.</p>}
          {callsQuery.isSuccess && callsQuery.data.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted"><tr>{["Lead", "Phone", "Status", "Outcome", "Scheduled At", "Attempts", "Action"].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-hairline">{callsQuery.data.map((call) => <tr key={call.id}><td className="px-4 py-3 text-heading">{call.lead_name || "—"}</td><td className="px-4 py-3 text-heading">{call.phone_e164}</td><td className="px-4 py-3 text-body">{call.status}</td><td className="px-4 py-3 text-body">{call.last_outcome || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(call.scheduled_at)}</td><td className="px-4 py-3 text-body">{call.attempts}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><select aria-label={`Outcome for ${call.lead_name || call.phone_e164}`} value={callOutcomes[call.id] ?? ""} onChange={(event) => setCallOutcomes((current) => ({ ...current, [call.id]: event.target.value as CallOutcome | "" }))} className="rounded-md border border-hairline-strong bg-surface-input px-2 py-1.5 text-xs text-heading"><option value="">Select outcome</option>{["no_answer", "not_connected", "busy", "failed", "completed", "hung_up", "cancelled"].map((outcome) => <option key={outcome} value={outcome}>{outcome.replace(/_/g, " ")}</option>)}</select><Button onClick={() => { const outcome = callOutcomes[call.id]; if (outcome) postOutcome.mutate({ campaignId: id, callId: call.id, outcome }, { onSuccess: (result) => { showSuccessNotification(result.retry_scheduled ? `Outcome saved; retry scheduled${result.next_attempt_at ? ` for ${formatDate(result.next_attempt_at)}` : ""}.` : "Call outcome saved.", { title: "Outcome saved" }); setCallOutcomes((current) => ({ ...current, [call.id]: "" })); } }); }} disabled={!callOutcomes[call.id] || (postOutcome.isPending && postOutcome.variables?.callId === call.id)}>{postOutcome.isPending && postOutcome.variables?.callId === call.id ? "Saving..." : "Save"}</Button></div></td></tr>)}</tbody></table></div>}
        </section>
      )}
    </div>
  );
}
