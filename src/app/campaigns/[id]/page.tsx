"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  IndianRupee,
  LayoutDashboard,
  Pause,
  Pencil,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Play,
  Radio,
  Receipt,
  Settings2,
  Timer,
  Trash2,
} from "lucide-react";

import { deleteCampaign } from "@/lib/api";
import type { CallAttempt, CallOutcome, Campaign, CampaignReport, ScheduledCampaignCall } from "@/types/types";
import {
  useAgents,
  useCampaign,
  useCampaignIds,
  useCampaignReport,
  usePlivoPools,
  usePostCampaignCallOutcome,
  useRepresentatives,
  useScheduleCampaign,
} from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import { formatDays, formatWindow } from "@/components/campaigns/CampaignsTab";
import DispatchPanel, { useToggleDispatch } from "@/components/campaigns/DispatchPanel";
import CampaignCosts from "@/components/campaigns/CampaignCosts";
import {
  Badge,
  Button,
  Card,
  ChipList,
  DetailList,
  Drawer,
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
  Tabs,
  formatDate,
  formatDuration,
  formatMoney,
  humanize,
  usePagination,
  useTabParam,
} from "@/components/ui";

const OUTCOMES: CallOutcome[] = ["completed", "no_answer", "not_connected", "busy", "failed", "hung_up", "cancelled"];
const CALL_HEAD = ["Lead", "Phone", "Status", "Last outcome", "Scheduled", "Attempts", "Talk time", ""];
// Must match the backend: an outcome can only be recorded while a call is live
const ACTIVE = new Set(["dialing", "ringing", "in_progress"]);

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "costs", label: "Costs", icon: IndianRupee },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

const talkSeconds = (call: ScheduledCampaignCall) =>
  (call.attempt_history ?? []).reduce((sum, a) => sum + (a.duration_seconds ?? 0), 0);

export default function CampaignDetailsPage() {
  // useTabParam reads the URL, which needs a Suspense boundary in the app router
  return (
    <Suspense fallback={<Loading label="Loading campaign" />}>
      <CampaignDetails />
    </Suspense>
  );
}

function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useTabParam(TABS.map((t) => t.id));

  // Check the ID exists first so a bad link shows "not found" instead of a request error
  const ids = useCampaignIds();
  const exists = ids.data?.includes(id) ?? false;
  const campaignQuery = useCampaign(id, ids.isSuccess && exists);
  const report = useCampaignReport(id, campaignQuery.isSuccess);
  const schedule = useScheduleCampaign();
  const campaign = campaignQuery.data;
  const dispatch = useToggleDispatch(id, campaign?.name ?? "Campaign");

  const remove = useMutation({
    mutationFn: () => deleteCampaign(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
      showSuccessNotification(`"${campaign?.name}" was deleted.`, { title: "Campaign deleted" });
      router.replace("/campaigns");
    },
  });

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
      message: `"${campaign.name}" and its calls will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete campaign",
    });
    if (ok) remove.mutate();
  };

  // One main action, depending on where the campaign is in its life
  const primary =
    campaign.status === "draft" ? (
      <Button onClick={handleSchedule} loading={schedule.isPending}>
        {!schedule.isPending && <CalendarClock size={16} aria-hidden />} Schedule calls
      </Button>
    ) : campaign.status === "scheduled" || campaign.status === "running" ? (
      <Button variant="secondary" onClick={() => dispatch.toggle(false)} loading={dispatch.pending}>
        {!dispatch.pending && <Pause size={16} aria-hidden />} Pause calls
      </Button>
    ) : campaign.status === "paused" ? (
      <Button onClick={() => dispatch.toggle(true)} loading={dispatch.pending}>
        {!dispatch.pending && <Play size={16} aria-hidden />} Resume calls
      </Button>
    ) : null;

  const callCount = report.data?.summary.total_calls;

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
            {primary}
          </>
        }
      />

      <div>
        <Tabs
          label="Campaign sections"
          tabs={TABS.map((t) => (t.id === "calls" && callCount !== undefined ? { ...t, count: callCount } : t))}
          active={tab}
          onChange={setTab}
        />
        <div role="tabpanel" className="space-y-6 pt-6">
          {tab === "overview" && <Overview campaignId={id} report={report.data} loading={report.isLoading} error={report.isError ? (report.error as Error).message : null} onRetry={() => report.refetch()} lastSchedule={schedule.data} />}
          {tab === "calls" && (
            <CallsCard
              campaignId={id}
              calls={report.data?.calls}
              loading={report.isLoading}
              error={report.isError ? (report.error as Error).message : null}
              onRetry={() => report.refetch()}
            />
          )}
          {tab === "costs" && <CampaignCosts calls={report.data?.calls} callsLoading={report.isLoading} />}
          {tab === "settings" && <SettingsTab campaign={campaign} />}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Overview -------------------------------- */

function Overview({
  campaignId,
  report,
  loading,
  error,
  onRetry,
  lastSchedule,
}: {
  campaignId: string;
  report: CampaignReport | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  lastSchedule: ReturnType<typeof useScheduleCampaign>["data"];
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  const s = report?.summary;
  const v = (n: React.ReactNode) => (loading || !s ? "—" : n);
  const pct = (n: number) => (s && s.total_calls ? ` · ${Math.round((n / s.total_calls) * 100)}%` : "");

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Leads to call" value={v(s?.total_calls)} icon={<PhoneCall size={16} />} hint={s ? `${s.queued_calls} still queued` : undefined} />
        <StatTile label="Answered" value={v(s?.answered_calls)} icon={<CheckCircle2 size={16} />} hint={s ? `Completed or hung up${pct(s.answered_calls)}` : undefined} />
        <StatTile label="Transferred" value={v(s?.transferred_calls)} icon={<PhoneForwarded size={16} />} hint={s ? `Handed to a transfer agent${pct(s.transferred_calls)}` : undefined} />
        <StatTile label="Not reached" value={v(s?.failed_calls)} icon={<PhoneOff size={16} />} hint={s ? `Failed, busy or no answer${pct(s.failed_calls)}` : undefined} />
        <StatTile label="Live right now" value={v(s?.live_calls)} icon={<Radio size={16} />} hint="Dialing, ringing or talking" />
        <StatTile label="Talk time" value={v(formatDuration(s?.total_call_seconds))} icon={<Clock size={16} />} hint={s ? `${s.total_call_minutes} min across all attempts` : undefined} />
        <StatTile label="Plivo billing" value={v(formatMoney(s?.total_billing, 4))} icon={<Receipt size={16} />} hint="Telephony charges, as billed by Plivo" />
        <StatTile label="Running for" value={v(formatDuration(s?.total_run_seconds))} icon={<Timer size={16} />} hint="Since the campaign started" />
      </div>

      <DispatchPanel campaignId={campaignId} />

      {lastSchedule && (
        <Card title="Last schedule run" description={formatDate(lastSchedule.scheduled_at)}>
          <DetailList
            columns={3}
            items={[
              { label: "Eligible leads", value: <span className="tnum">{lastSchedule.eligible_leads}</span> },
              { label: "Calls created", value: <span className="tnum">{lastSchedule.created_calls}</span> },
              { label: "Already scheduled", value: <span className="tnum">{lastSchedule.already_scheduled}</span> },
              { label: "Skipped (do not call)", value: <span className="tnum">{lastSchedule.skipped_do_not_call}</span> },
            ]}
          />
        </Card>
      )}
    </>
  );
}

/* --------------------------------- Calls ---------------------------------- */

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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => calls ?? [], [calls]);
  const statuses = [...new Set(list.map((c) => c.status))].sort();
  const term = search.trim().toLowerCase();
  const filtered = list.filter(
    (c) =>
      (status === "all" || c.status === status) &&
      (!term || `${c.lead_name ?? ""} ${c.phone_e164}`.toLowerCase().includes(term)),
  );
  const pagination = usePagination(filtered, 25);
  const open = list.find((c) => c.id === openId) ?? null;

  return (
    <>
      <Card
        flush
        title="Calls"
        description="One row per lead. Open a call to see every attempt, its recording and the transcript."
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
              title="No calls yet"
              text="Calls are created from the uploaded leads sheet when the campaign is scheduled."
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
                pagination.pageItems.map((call) => (
                  <CallRow key={call.id} call={call} onOpen={() => setOpenId(call.id)} />
                ))
              )}
            </Table>
            <div className="px-4">
              <Pagination {...pagination} noun="calls" />
            </div>
          </div>
        )}
      </Card>

      {open && <CallDrawer campaignId={campaignId} call={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function CallRow({ call, onOpen }: { call: ScheduledCampaignCall; onOpen: () => void }) {
  const live = ACTIVE.has(call.status.toLowerCase());
  return (
    <tr
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="cursor-pointer align-middle outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_3px_0_0_var(--accent)]"
    >
      <td className="px-4 py-3 font-medium text-heading">
        {call.lead_name || <span className="text-faint">Unnamed</span>}
        {live && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-gain">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-gain" /> Live
          </span>
        )}
      </td>
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
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">{talkSeconds(call) ? formatDuration(talkSeconds(call)) : <span className="text-faint">—</span>}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-accent-text">View</td>
    </tr>
  );
}

/**
 * One lead's call: its attempts (newest first) with billing, recording and transcript,
 * plus recording an outcome while the call is live
 */
function CallDrawer({ campaignId, call, onClose }: { campaignId: string; call: ScheduledCampaignCall; onClose: () => void }) {
  const postOutcome = usePostCampaignCallOutcome();
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const live = ACTIVE.has(call.status.toLowerCase());
  const attempts = [...(call.attempt_history ?? [])].sort((a, b) => b.attempt_no - a.attempt_no);

  const save = () => {
    if (!outcome) return;
    postOutcome.mutate(
      { campaignId, callId: call.id, outcome },
      {
        onSuccess: (r) => {
          showSuccessNotification(
            r.retry_scheduled ? `Retry scheduled${r.next_attempt_at ? ` for ${formatDate(r.next_attempt_at)}` : ""}.` : "The call outcome was saved.",
            { title: "Outcome saved" },
          );
          setOutcome("");
        },
      },
    );
  };

  return (
    <Drawer wide title={call.lead_name || call.phone_e164} description={call.lead_name ? call.phone_e164 : undefined} onClose={onClose}>
      <DetailList
        columns={3}
        items={[
          { label: "Status", value: <StatusBadge status={call.status} /> },
          { label: "Last outcome", value: call.last_outcome ? <StatusBadge status={call.last_outcome} /> : "—" },
          { label: "Attempts", value: <span className="tnum">{call.attempts} of {call.retry_count + 1}</span> },
          { label: "Scheduled", value: formatDate(call.scheduled_at) },
          { label: "Called from", value: <span className="tnum">{call.caller_number ?? "—"}</span> },
          { label: "Retries when", value: call.retry_on.map(humanize).join(", ") || "—" },
        ]}
      />

      {live && (
        <section className="rounded-lg border border-gain/30 bg-gain-bg/50 p-4">
          <h4 className="text-sm font-semibold text-heading">Record outcome</h4>
          <p className="mt-0.5 text-xs text-muted">Only possible while the call is live. Some outcomes schedule a retry.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select aria-label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome | "")} className="w-48">
              <option value="">Choose an outcome…</option>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {humanize(o)}
                </option>
              ))}
            </Select>
            <Button onClick={save} disabled={!outcome} loading={postOutcome.isPending}>
              Save outcome
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h4 className="eyebrow">Attempts</h4>
        {attempts.length === 0 ? (
          <p className="rounded-md bg-raised px-4 py-6 text-center text-sm text-muted">Not dialled yet.</p>
        ) : (
          attempts.map((a) => <AttemptCard key={a.id} attempt={a} />)
        )}
      </section>
    </Drawer>
  );
}

function AttemptCard({ attempt: a }: { attempt: CallAttempt }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const transcript = a.transcript ?? [];
  const transferred = ["completed", "success", "answered", "transferred"].includes((a.transfer_status ?? "").toLowerCase());

  return (
    <article className="rounded-lg border border-hairline bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="tnum text-sm font-semibold text-heading">Attempt {a.attempt_no}</span>
          <StatusBadge status={a.status} />
          {transferred && <Badge tone="gain">Transferred</Badge>}
        </div>
        <span className="text-xs text-muted">{formatDate(a.ended_at ?? a.submitted_at)}</span>
      </header>

      <div className="space-y-4 p-4">
        <DetailList
          columns={3}
          items={[
            { label: "Duration", value: <span className="tnum">{a.duration_seconds ? formatDuration(a.duration_seconds) : "—"}</span> },
            { label: "Plivo cost", value: <span className="tnum">{a.total_amount ? formatMoney(a.total_amount, 4) : "—"}</span> },
            { label: "Rate", value: <span className="tnum">{a.total_rate ?? "—"}</span> },
            { label: "Hang-up", value: a.hangup_cause_name ? `${a.hangup_cause_name}${a.hangup_source ? ` (by ${a.hangup_source.toLowerCase()})` : ""}` : "—" },
            { label: "Transfer", value: a.transfer_status ? `${humanize(a.transfer_status)}${a.transfer_reason ? ` — ${a.transfer_reason}` : ""}` : "None" },
            { label: "Plivo status", value: a.plivo_status ? humanize(a.plivo_status) : "—" },
          ]}
        />

        {a.recording_url && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted">Recording</p>
            <audio controls preload="none" src={a.recording_url} className="w-full">
              <a href={a.recording_url}>Download recording</a>
            </audio>
          </div>
        )}

        {transcript.length > 0 && (
          <div>
            <button
              type="button"
              aria-expanded={showTranscript}
              onClick={() => setShowTranscript((v) => !v)}
              className="text-sm font-medium text-accent-text underline-offset-2 hover:underline"
            >
              {showTranscript ? "Hide" : "Show"} transcript ({transcript.length} lines)
            </button>
            {showTranscript && (
              <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-md bg-raised p-3">
                {transcript.map((line, i) => {
                  const agent = line.role === "assistant";
                  return (
                    <li key={i} className={clsx("flex", agent ? "justify-start" : "justify-end")}>
                      <div
                        className={clsx(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          agent ? "bg-surface text-body" : "bg-accent-bg text-heading",
                        )}
                      >
                        <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide text-muted">
                          {agent ? "Agent" : "Lead"}
                        </span>
                        {line.content ?? Object.values(line).join(" ")}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/* -------------------------------- Settings -------------------------------- */

function SettingsTab({ campaign }: { campaign: Campaign }) {
  const agents = useAgents();
  const representatives = useRepresentatives();
  const plivoPools = usePlivoPools();
  const nameOf = <T extends { id: string; name: string }>(list: T[] | undefined, itemId: string) =>
    list?.find((x) => x.id === itemId)?.name ?? `${itemId.slice(0, 8)}…`;
  const agentName = agents.data?.find((a) => a.id === campaign.agent_id)?.name;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Who and from where" className="lg:col-span-2">
        <DetailList
          items={[
            {
              label: "Calling agent",
              value: <ChipList items={[{ key: campaign.agent_id, label: agentName ?? "Unknown agent", href: `/calling-agent/agents/${campaign.agent_id}` }]} />,
            },
            {
              label: "Call transfer agents",
              value: (
                <ChipList
                  empty="Every active transfer agent"
                  items={campaign.representative_ids.map((r) => ({ key: r, label: nameOf(representatives.data, r), href: "/calling-agent?tab=representatives" }))}
                />
              ),
            },
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

      <Card title="Timing & limits">
        <DetailList
          columns={2}
          items={[
            { label: "Start", value: formatDate(campaign.start_at) },
            { label: "Calling hours", value: <span className="tnum">{formatWindow(campaign.window_start, campaign.window_end)}</span> },
            { label: "Call days", value: formatDays(campaign.call_days) },
            { label: "Timezone", value: campaign.timezone },
            { label: "Parallel calls", value: <span className="tnum">{campaign.concurrency_limit}</span> },
            ...(campaign.max_live_calls !== undefined ? [{ label: "Max live calls", value: <span className="tnum">{campaign.max_live_calls}</span> }] : []),
            ...(campaign.calls_per_second !== undefined ? [{ label: "New calls / second", value: <span className="tnum">{campaign.calls_per_second}</span> }] : []),
            { label: "Transfer ring time", value: <span className="tnum">{campaign.transfer_timeout_seconds}s</span> },
            { label: "Retries", value: <span className="tnum">{campaign.retry_count} × every {campaign.retry_interval_minutes} min</span> },
            { label: "Retry when", wide: true, value: <ChipList items={campaign.retry_on.map((r) => ({ key: r, label: humanize(r) }))} /> },
          ]}
        />
      </Card>
    </div>
  );
}
