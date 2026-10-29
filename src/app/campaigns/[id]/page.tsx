"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/calling-agent/ui";
import { showErrorNotification, showSuccessNotification } from "@/hooks/useNotification";
import {
  useCampaign,
  useCampaignCalls,
  useCampaignIds,
  usePostCampaignCallOutcome,
  useScheduleCampaign,
} from "@/hooks/hooks";
import type { CallOutcome } from "@/types/types";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const formatTime = (value?: string | null) => (value ? value.slice(0, 5) : "—");

export default function CampaignDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Check the ID exists first so a bad link shows "not found" instead of a request error
  const ids = useCampaignIds();
  const exists = ids.data?.includes(id) ?? false;
  const campaignQuery = useCampaign(id, ids.isSuccess && exists);
  const calls = useCampaignCalls(id, campaignQuery.isSuccess);
  const agents = useAgents();
  const representatives = useRepresentatives();
  const plivoPools = usePlivoPools();
  const schedule = useScheduleCampaign();
  const postOutcome = usePostCampaignCallOutcome();
  const [callOutcomes, setCallOutcomes] = useState<
    Record<string, CallOutcome | "">
  >({});
  const campaign = campaignQuery.data;

  const details: Array<[string, string]> = campaign
    ? [
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
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign?.name ?? "Campaign details"}
        description="Campaign information loaded by its ID."
        actions={
          <div className="flex items-center gap-2">
            {campaign && (
              <Button
                onClick={() =>
                  schedule.mutate(id, {
                    onSuccess: (result) =>
                      showSuccessNotification(
                        `${result.created_calls} calls scheduled.`,
                        { title: "Campaign scheduled" },
                      ),
                  })
                }
                disabled={schedule.isPending}
              >
                {schedule.isPending ? "Scheduling..." : "Schedule Campaign"}
              </Button>
            )}
            <button
              type="button"
              onClick={() => router.push("/campaigns")}
              className="rounded-md border border-hairline px-4 py-2 text-sm text-body transition-colors hover:bg-surface-hover"
            >
              Back to campaigns
            </button>
          </div>
        }
      />
      <section className="rounded-lg border border-hairline bg-surface p-5 shadow-sm">
        {(idsQuery.isLoading ||
          (campaignIdExists && campaignQuery.isLoading)) && (
          <p className="text-sm text-muted">Loading campaign...</p>
        )}
        {idsQuery.isError && (
          <p className="text-sm text-loss">
            Failed to load campaign IDs: {(idsQuery.error as Error).message}
          </p>
        )}
        {idsQuery.isSuccess && !campaignIdExists && (
          <p className="text-sm text-muted">Campaign not found.</p>
        )}
        {campaignQuery.isError && (
          <p className="text-sm text-loss">
            Failed to load campaign: {(campaignQuery.error as Error).message}
          </p>
        )}
        {schedule.isError && (
          <p className="mb-4 text-sm text-loss">
            Failed to schedule campaign: {(schedule.error as Error).message}
          </p>
        )}
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
          <h2 className="text-base font-semibold text-heading">
            Schedule result
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Scheduled At", formatDate(schedule.data.scheduled_at)],
              ["Eligible Leads", String(schedule.data.eligible_leads)],
              ["Calls Created", String(schedule.data.created_calls)],
              ["Already Scheduled", String(schedule.data.already_scheduled)],
              [
                "Skipped Do Not Call",
                String(schedule.data.skipped_do_not_call),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted">{label}</dt>
                <dd className="mt-1 font-medium text-heading">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {campaign && (
        <section className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-sm">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="text-base font-semibold text-heading">
              Campaign calls
            </h2>
          </div>
          {callsQuery.isLoading && (
            <p className="p-5 text-sm text-muted">Loading campaign calls...</p>
          )}
          {callsQuery.isError && (
            <p className="p-5 text-sm text-loss">
              Failed to load campaign calls:{" "}
              {(callsQuery.error as Error).message}
            </p>
          )}
          {postOutcome.isError && (
            <p className="px-5 pb-3 text-sm text-loss">
              Failed to save call outcome:{" "}
              {(postOutcome.error as Error).message}
            </p>
          )}
          {callsQuery.isSuccess && callsQuery.data.length === 0 && (
            <p className="p-5 text-sm text-muted">
              No calls scheduled for this campaign.
            </p>
          )}
          {callsQuery.isSuccess && callsQuery.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted">
                  <tr>
                    {[
                      "Lead",
                      "Phone",
                      "Status",
                      "Outcome",
                      "Scheduled At",
                      "Attempts",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-3 font-medium"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {callsQuery.data.map((call) => {
                    const isActiveCall = [
                      "active",
                      "calling",
                      "in_progress",
                    ].includes(call.status.toLowerCase());
                    return (
                      <tr key={call.id}>
                        <td className="px-4 py-3 text-heading">
                          {call.lead_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-heading">
                          {call.phone_e164}
                        </td>
                        <td className="px-4 py-3 text-body">{call.status}</td>
                        <td className="px-4 py-3 text-body">
                          {call.last_outcome || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                          {formatDate(call.scheduled_at)}
                        </td>
                        <td className="px-4 py-3 text-body">{call.attempts}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              aria-label={`Outcome for ${call.lead_name || call.phone_e164}`}
                              value={callOutcomes[call.id] ?? ""}
                              onChange={(event) =>
                                setCallOutcomes((current) => ({
                                  ...current,
                                  [call.id]: event.target.value as
                                    | CallOutcome
                                    | "",
                                }))
                              }
                              className="rounded-md border border-hairline-strong bg-surface-input px-2 py-1.5 text-xs text-heading"
                            >
                              <option value="">Select outcome</option>
                              {[
                                "no_answer",
                                "not_connected",
                                "busy",
                                "failed",
                                "completed",
                                "hung_up",
                                "cancelled",
                              ].map((outcome) => (
                                <option key={outcome} value={outcome}>
                                  {outcome.replace(/_/g, " ")}
                                </option>
                              ))}
                            </select>
                            <Button
                              onClick={() => {
                                if (!isActiveCall) {
                                  showErrorNotification(
                                    "Call outcome can only be recorded for an active call.",
                                    { title: "Call is not active" },
                                  );
                                  return;
                                }
                                const outcome = callOutcomes[call.id];
                                if (outcome)
                                  postOutcome.mutate(
                                    {
                                      campaignId: id,
                                      callId: call.id,
                                      outcome,
                                    },
                                    {
                                      onSuccess: (result) => {
                                        showSuccessNotification(
                                          result.retry_scheduled
                                            ? `Outcome saved; retry scheduled${result.next_attempt_at ? ` for ${formatDate(result.next_attempt_at)}` : ""}.`
                                            : "Call outcome saved.",
                                          { title: "Outcome saved" },
                                        );
                                        setCallOutcomes((current) => ({
                                          ...current,
                                          [call.id]: "",
                                        }));
                                      },
                                    },
                                  );
                              }}
                              aria-disabled={
                                !isActiveCall ||
                                !callOutcomes[call.id] ||
                                (postOutcome.isPending &&
                                  postOutcome.variables?.callId === call.id)
                              }
                              disabled={
                                postOutcome.isPending &&
                                postOutcome.variables?.callId === call.id
                              }
                              className={
                                !isActiveCall || !callOutcomes[call.id]
                                  ? "cursor-not-allowed opacity-50"
                                  : undefined
                              }
                            >
                              {postOutcome.isPending &&
                              postOutcome.variables?.callId === call.id
                                ? "Saving..."
                                : "Save"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Setup" className="lg:col-span-2">
          <DetailList
            items={[
              {
                label: "Calling agent",
                value: (
                  <ChipList
                    items={[{ key: campaign.agent_id, label: agentName ?? "Unknown agent", href: `/calling-agent/agents/${campaign.agent_id}` }]}
                  />
                ),
              },
              { label: "Representatives", value: <ChipList items={campaign.representative_ids.map((r) => ({ key: r, label: nameOf(representatives.data, r), href: "/calling-agent?tab=representatives" }))} /> },
              {
                label: "Plivo pools",
                wide: true,
                value: <ChipList items={campaign.plivo_pool_ids.map((p) => ({ key: p, label: nameOf(plivoPools.data, p), href: `/number-pool/pools/${p}` }))} />,
              },
              ...(campaign.plivo_numbers.length
                ? [{ label: "Caller numbers", wide: true, value: <ChipList items={campaign.plivo_numbers.map((n) => ({ key: n, label: <span className="tnum">{n}</span> }))} /> }]
                : []),
            ]}
          />
        </Card>

        <Card title="Schedule & retries">
          <DetailList
            columns={2}
            items={[
              { label: "Start", value: campaign.status === "scheduled" ? formatDate(campaign.start_at) : "When run" },
              { label: "Calling window", value: <span className="tnum">{formatWindow(campaign.window_start, campaign.window_end)}</span> },
              { label: "Timezone", value: campaign.timezone },
              { label: "Concurrent calls", value: <span className="tnum">{campaign.concurrency_limit}</span> },
              { label: "Transfer timeout", value: <span className="tnum">{campaign.transfer_timeout_seconds}s</span> },
              { label: "Retries", value: <span className="tnum">{campaign.retry_count} × every {campaign.retry_interval_minutes} min</span> },
              { label: "Retry when", wide: true, value: <ChipList items={campaign.retry_on.map((r) => ({ key: r, label: humanize(r) }))} /> },
            ]}
          />
        </Card>
      </div>

      <CallsCard campaignId={id} calls={calls.data} loading={calls.isLoading} error={calls.isError ? (calls.error as Error).message : null} onRetry={() => calls.refetch()} />

    </div>
  );
}

function CallsCard({
  campaignId,
  calls,
  loading,
  error,
  onRetry,
}: {
  campaignId: string;
  calls: ScheduledCampaignCall[] | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const postOutcome = usePostCampaignCallOutcome();
  const [outcomes, setOutcomes] = useState<Record<string, CallOutcome | "">>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const list = calls ?? [];
  const statuses = [...new Set(list.map((c) => c.status))].sort();
  const term = search.trim().toLowerCase();
  const filtered = list.filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (!term || `${c.lead_name ?? ""} ${c.phone_e164}`.toLowerCase().includes(term)),
  );
  const pagination = usePagination(filtered, 25);

  const save = (call: ScheduledCampaignCall) => {
    const outcome = outcomes[call.id];
    if (!outcome) return;
    postOutcome.mutate(
      { campaignId, callId: call.id, outcome },
      {
        onSuccess: (r) => {
          showSuccessNotification(
            r.retry_scheduled
              ? `Retry scheduled${r.next_attempt_at ? ` for ${formatDate(r.next_attempt_at)}` : ""}.`
              : "The call outcome was saved.",
            { title: "Outcome saved" },
          );
          setOutcomes((cur) => ({ ...cur, [call.id]: "" }));
        },
      },
    );
  };

  return (
    <Card
      flush
      title="Calls"
      description="Every lead this campaign will dial, with its latest result."
      actions={
        list.length > 0 && (
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" className="w-full sm:w-60" />
            <Select aria-label="Filter calls by status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-40">
              <option value="all">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </>
        )
      }
    >
      {error ? (
        <div className="p-5">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      ) : !loading && list.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={<CalendarClock size={20} />}
            title="No calls scheduled yet"
            text="Use “Schedule calls” to create a call for every eligible lead from this campaign's uploaded sheet."
          />
        </div>
      ) : (
        <div className="space-y-3 pb-3">
          <Table bare head={CALL_HEAD} label="Campaign calls">
            {loading ? (
              <SkeletonRows cols={CALL_HEAD.length} />
            ) : filtered.length === 0 ? (
              <TableMessage cols={CALL_HEAD.length}>No calls match your filters.</TableMessage>
            ) : (
              pagination.pageItems.map((call) => {
                const saving = postOutcome.isPending && postOutcome.variables?.callId === call.id;
                return (
                  <tr key={call.id} className="align-middle">
                    <td className="px-4 py-3 font-medium text-heading">{call.lead_name || <span className="text-faint">Unnamed</span>}</td>
                    <td className="tnum whitespace-nowrap px-4 py-3 text-body">{call.phone_e164}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="px-4 py-3">{call.last_outcome ? <StatusBadge status={call.last_outcome} /> : <span className="text-faint">—</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(call.scheduled_at)}</td>
                    <td className="tnum px-4 py-3 text-body">
                      {call.attempts}
                      <span className="text-faint"> / {call.retry_count + 1}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label={`Outcome for ${call.lead_name || call.phone_e164}`}
                          value={outcomes[call.id] ?? ""}
                          onChange={(e) => setOutcomes((cur) => ({ ...cur, [call.id]: e.target.value as CallOutcome | "" }))}
                          className="w-40"
                        >
                          <option value="">Choose…</option>
                          {OUTCOMES.map((o) => (
                            <option key={o} value={o}>
                              {humanize(o)}
                            </option>
                          ))}
                        </Select>
                        <Button size="sm" variant="secondary" onClick={() => save(call)} disabled={!outcomes[call.id]} loading={saving}>
                          Save
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </Table>
          <div className="px-4">
            <Pagination {...pagination} noun="calls" />
          </div>
        </div>
      )}
    </Card>
  );
}
