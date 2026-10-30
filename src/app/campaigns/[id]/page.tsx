"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, ListChecks, Pencil, PhoneCall, Repeat, Trash2 } from "lucide-react";

import { deleteCampaign } from "@/lib/api";
import type { CallOutcome, ScheduledCampaignCall } from "@/types/types";
import {
  useAgents,
  useCampaign,
  useCampaignCalls,
  useCampaignIds,
  usePlivoPools,
  usePostCampaignCallOutcome,
  useRepresentatives,
  useScheduleCampaign,
} from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import { formatWindow } from "@/components/campaigns/CampaignsTab";
import {
  Button,
  Card,
  ChipList,
  DetailList,
  EmptyState,
  ErrorState,
  Loading,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  SkeletonRows,
  StatTile,
  StatusBadge,
  Table,
  TableMessage,
  formatDate,
  humanize,
  usePagination,
} from "@/components/ui";

const OUTCOMES: CallOutcome[] = ["completed", "no_answer", "not_connected", "busy", "failed", "hung_up", "cancelled"];
const CALL_HEAD = ["Lead", "Phone", "Status", "Last outcome", "Scheduled", "Attempts", "Record outcome"];
const QUEUED = new Set(["scheduled", "queued", "pending", "retry"]);
// The backend only accepts an outcome for a call that's in progress
const ACTIVE = new Set(["active", "calling", "in_progress"]);

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

  const campaign = campaignQuery.data;

  const remove = useMutation({
    mutationFn: () => deleteCampaign(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
      showSuccessNotification(`"${campaign?.name}" was deleted.`, { title: "Campaign deleted" });
      router.replace("/campaigns");
    },
  });

  const callStats = useMemo(() => {
    const list = calls.data ?? [];
    return {
      total: list.length,
      completed: list.filter((c) => c.status === "completed" || c.last_outcome === "completed").length,
      queued: list.filter((c) => QUEUED.has(c.status)).length,
      attempts: list.reduce((sum, c) => sum + c.attempts, 0),
    };
  }, [calls.data]);

  const crumbs = [{ label: "Campaigns", href: "/campaigns" }, { label: campaign?.name ?? "Campaign" }];

  if (ids.isLoading || (exists && campaignQuery.isLoading)) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title={<Skeleton className="h-8 w-64" />} />
        <Loading label="Loading campaign" />
      </div>
    );
  }

  if (ids.isError || campaignQuery.isError) {
    const err = (ids.error ?? campaignQuery.error) as Error;
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title="Campaign" />
        <ErrorState message={err.message} onRetry={() => (ids.isError ? ids.refetch() : campaignQuery.refetch())} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title="Campaign not found" />
        <EmptyState
          title="This campaign doesn't exist"
          text="It may have been deleted, or the link is wrong."
          action={<Button onClick={() => router.push("/campaigns")}>Back to campaigns</Button>}
        />
      </div>
    );
  }

  const nameOf = <T extends { id: string; name: string }>(list: T[] | undefined, itemId: string) =>
    list?.find((x) => x.id === itemId)?.name ?? `${itemId.slice(0, 8)}…`;
  const agentName = agents.data?.find((a) => a.id === campaign.agent_id)?.name;

  const handleSchedule = () =>
    schedule.mutate(id, {
      onSuccess: (r) =>
        showSuccessNotification(`${r.created_calls} new call${r.created_calls === 1 ? "" : "s"} scheduled.`, {
          title: "Campaign scheduled",
        }),
    });

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: "Delete campaign?",
      message: `"${campaign.name}" and its scheduled calls will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete campaign",
    });
    if (ok) remove.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={crumbs}
        title={campaign.name}
        meta={<StatusBadge status={campaign.status} />}
        description={`Created ${formatDate(campaign.created_at)} · Updated ${formatDate(campaign.updated_at)}`}
        actions={
          <>
            <Button variant="secondary" onClick={handleDelete} loading={remove.isPending} className="text-loss">
              <Trash2 size={16} aria-hidden /> Delete
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/campaigns/${id}/edit`)}>
              <Pencil size={16} aria-hidden /> Edit
            </Button>
            <Button onClick={handleSchedule} loading={schedule.isPending}>
              {!schedule.isPending && <CalendarClock size={16} aria-hidden />} Schedule calls
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Scheduled calls" value={calls.isLoading ? "—" : callStats.total} icon={<PhoneCall size={16} />} />
        <StatTile label="Completed" value={calls.isLoading ? "—" : callStats.completed} icon={<CheckCircle2 size={16} />} />
        <StatTile label="Waiting to dial" value={calls.isLoading ? "—" : callStats.queued} icon={<ListChecks size={16} />} />
        <StatTile label="Dial attempts" value={calls.isLoading ? "—" : callStats.attempts} icon={<Repeat size={16} />} />
      </div>

      {schedule.data && (
        <Card title="Last schedule run" description={formatDate(schedule.data.scheduled_at)}>
          <DetailList
            columns={3}
            items={[
              { label: "Eligible leads", value: <span className="tnum">{schedule.data.eligible_leads}</span> },
              { label: "Calls created", value: <span className="tnum">{schedule.data.created_calls}</span> },
              { label: "Already scheduled", value: <span className="tnum">{schedule.data.already_scheduled}</span> },
              { label: "Skipped (do not call)", value: <span className="tnum">{schedule.data.skipped_do_not_call}</span> },
            ]}
          />
        </Card>
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
              { label: "Call transfer agents", value: <ChipList empty="All active" items={campaign.representative_ids.map((r) => ({ key: r, label: nameOf(representatives.data, r), href: "/calling-agent?tab=representatives" }))} /> },
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
      description="Every lead this campaign will dial, with its latest result. Outcomes can be recorded while a call is active."
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
                const active = ACTIVE.has(call.status.toLowerCase());
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
                      {active ? (
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
                      ) : (
                        <span className="text-xs text-faint">Only while the call is active</span>
                      )}
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
