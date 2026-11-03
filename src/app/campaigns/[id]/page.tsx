"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ArrowLeft,
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
  Tags,
  Timer,
  Trash2,
} from "lucide-react";

import { deleteCampaign, getCallCosts } from "@/lib/api";
import type { CallAttempt, CallCost, CallOutcome, Campaign, CampaignReport, ScheduledCampaignCall } from "@/types/types";
import {
  useAgents,
  useCampaign,
  useCampaignClassificationCalls,
  useCampaignClassifications,
  useCampaignIds,
  useCampaignReport,
  useCampaignUnclassifiedCalls,
  useClassifications,
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
import type { ClassificationCallsResponse } from "@/lib/callingAgentApi";

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
const CALL_HEAD = ["Lead", "Phone", "Status", "Talk time", "Plivo cost", "AI cost", "Total cost"];
const CLASSIFICATION_BAR_COLORS = [
  "#279be8",
  "#a43be0",
  "#20b98b",
  "#efa512",
] as const;
// Must match the backend: an outcome can only be recorded while a call is live
const ACTIVE = new Set(["dialing", "ringing", "in_progress"]);

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "costs", label: "Costs", icon: IndianRupee },
  { id: "classification", label: "Classification", icon: Tags },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

const talkSeconds = (call: ScheduledCampaignCall) =>
  (call.attempt_history ?? []).reduce((sum, a) => sum + (a.duration_seconds ?? 0), 0);

const hasSentWhatsAppMessages = (call: ScheduledCampaignCall) =>
  (call.attempt_history ?? []).some((attempt) => (attempt.whatsapp_messages?.length ?? 0) > 0);

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
          {tab === "classification" && (
            <CampaignClassificationChart campaignId={id} agentId={campaign.agent_id} />
          )}
          {tab === "settings" && <SettingsTab campaign={campaign} />}
        </div>
      </div>
    </div>
  );
}

function CampaignClassificationChart({ campaignId, agentId }: { campaignId: string; agentId: string }) {
  const summary = useCampaignClassifications(campaignId);
  const configured = useClassifications(agentId, campaignId);
  const agents = useAgents();
  const [selected, setSelected] = useState<{ id: string | null; name: string } | null>(null);

  if (selected) {
    return selected.id ? (
      <CampaignClassificationCalls
        campaignId={campaignId}
        classificationId={selected.id}
        classificationName={selected.name}
        onBack={() => setSelected(null)}
      />
    ) : (
      <CampaignUnclassifiedCalls campaignId={campaignId} onBack={() => setSelected(null)} />
    );
  }

  if (summary.status === "pending" || configured.isLoading || agents.isLoading) {
    return <Loading label="Loading classifications" />;
  }
  if (summary.status === "error") return <ErrorState message={summary.error.message} onRetry={() => summary.refetch()} />;

  const classifications = summary.data.classifications ?? [];
  const configuredClassifications = configured.data?.classifications ?? [];
  const agentClassifications = agents.data?.find((agent) => agent.id === agentId)?.classifications ?? [];
  const categories = configuredClassifications.length
    ? configuredClassifications
    : classifications.length
      ? classifications
      : agentClassifications;
  const bars: Array<{ id: string | null; name: string; calls: number }> = categories.map((classification) => ({
    id: classification.id,
    name: classification.name,
    calls: classifications.find((item) => item.id === classification.id)?.calls ?? 0,
  }));
  if ((summary.data.unclassified_calls ?? 0) > 0 || bars.length === 0) {
    bars.push({ id: null, name: "Unclassified", calls: summary.data.unclassified_calls ?? 0 });
  }
  const noCallValues = bars.every((bar) => bar.calls === 0);
  const maxCalls = Math.max(1, ...bars.map((bar) => bar.calls));
  const yTicks = [...new Set([maxCalls, Math.ceil(maxCalls * 0.75), Math.ceil(maxCalls * 0.5), Math.ceil(maxCalls * 0.25), 0])];

  return (
    <Card
      title="Call classifications"
      description={`${summary.data.total_calls} calls grouped by classification. Select a bar to inspect its calls.`}
    >
      <div
        role="group"
        aria-label="Calls by classification"
        className="flex min-h-64 gap-2 overflow-x-auto px-2 pb-2 pt-5"
      >
        <div className="relative h-40 w-7 shrink-0 text-right text-xs text-muted" aria-hidden="true">
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 tnum"
              style={{ top: `${(1 - tick / maxCalls) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40" aria-hidden="true">
            {yTicks.map((tick) => (
              <span
                key={tick}
                className="absolute inset-x-0 border-t border-dashed border-hairline"
                style={{ top: `${(1 - tick / maxCalls) * 100}%` }}
              />
            ))}
          </div>
          <div
            className="relative z-10 grid h-56 w-full gap-3"
            style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
          >
            {bars.map((bar, index) => {
              const color = CLASSIFICATION_BAR_COLORS[index % CLASSIFICATION_BAR_COLORS.length];
              const barHeight = noCallValues ? 28 + ((index * 37 + 19) % 58) : Math.max(5, (bar.calls / maxCalls) * 100);
              return (
                <button
                  key={bar.id ?? "unclassified"}
                  type="button"
                  onClick={() => setSelected({ id: bar.id, name: bar.name })}
                  aria-label={`${bar.name}: ${bar.calls} calls. View calls`}
                  className="group grid h-56 grid-rows-[10rem_2rem] justify-items-center gap-2 rounded-md text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="relative flex h-40 w-full items-end justify-center overflow-visible border-b border-hairline">
                    <span
                      className="tnum absolute z-10 text-xs font-semibold text-heading"
                      style={{ bottom: `calc(${barHeight}% + 4px)` }}
                    >
                      {bar.calls}
                    </span>
                    <span
                      className={clsx(
                        "block w-1/2 max-w-20 rounded-t-md transition-[height,opacity] group-hover:opacity-90",
                        noCallValues && "animate-pulse opacity-40",
                      )}
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor: color,
                        boxShadow: noCallValues ? undefined : `0 2px 8px ${color}35`,
                      }}
                    />
                  </span>
                  <span className="line-clamp-2 min-h-8 text-xs font-medium text-heading">{bar.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {noCallValues && (
        <p className="px-5 pb-4 text-center text-xs text-muted">
          Placeholder bars show the available classifications. Values will appear when calls are classified.
        </p>
      )}
    </Card>
  );
}

function CampaignClassificationCalls({
  campaignId,
  classificationId,
  classificationName,
  onBack,
}: {
  campaignId: string;
  classificationId: string;
  classificationName: string;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const calls = useCampaignClassificationCalls(campaignId, classificationId, { page, page_size: pageSize });

  return (
    <ClassificationCallsPanel
      title={classificationName}
      data={calls.data}
      loading={calls.isLoading}
      error={calls.isError ? calls.error.message : null}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onBack={onBack}
      onRetry={() => calls.refetch()}
    />
  );
}

function CampaignUnclassifiedCalls({ campaignId, onBack }: { campaignId: string; onBack: () => void }) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const calls = useCampaignUnclassifiedCalls(campaignId, { page, page_size: pageSize });

  return (
    <ClassificationCallsPanel
      title="Unclassified calls"
      data={calls.data}
      loading={calls.isLoading}
      error={calls.isError ? calls.error.message : null}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onBack={onBack}
      onRetry={() => calls.refetch()}
    />
  );
}

function ClassificationCallsPanel({
  title,
  data,
  loading,
  error,
  page,
  pageSize,
  onPageChange,
  onBack,
  onRetry,
}: {
  title: string;
  data: ClassificationCallsResponse | undefined;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  const calls = data?.calls ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <Button variant="secondary" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> All classifications
      </Button>

      <Card title={title} description={`${total} call${total === 1 ? "" : "s"} in this classification.`}>
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : calls.length === 0 ? (
          <EmptyState title="No calls in this classification" text="No call records are available yet." />
        ) : (
          <div className="space-y-4">
            {calls.map((call, index) => (
              <article
                key={call.call_uuid ?? call.attempt_id ?? `${page}-${index}`}
                className="space-y-3 rounded-lg border border-hairline bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-heading">{call.name || "Unnamed caller"}</h3>
                    <p className="tnum mt-0.5 text-sm text-muted">{call.phone || "No phone number"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    {call.status && <StatusBadge status={call.status} />}
                    {call.duration_seconds != null && <span>{formatDuration(call.duration_seconds)}</span>}
                    <span>{formatDate(call.classified_at ?? call.ended_at)}</span>
                  </div>
                </div>
                {call.reason && (
                  <p className="whitespace-pre-wrap rounded-md bg-raised p-3 text-sm text-body">{call.reason}</p>
                )}
                {call.audio && (
                  <audio controls preload="none" src={call.audio} className="w-full">
                    Your browser does not support audio.
                  </audio>
                )}
                {call.transcript != null && (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-accent-text">View transcript</summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-raised p-3 text-xs text-body">
                      {typeof call.transcript === "string"
                        ? call.transcript
                        : JSON.stringify(call.transcript, null, 2) ?? ""}
                    </pre>
                  </details>
                )}
              </article>
            ))}

            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4 text-sm text-muted">
                <span>Page {page} of {pageCount} · {total} calls</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                    Previous
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
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
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const costs = useQuery({
    queryKey: ["call-costs", "list", 1, 500],
    queryFn: () => getCallCosts(1, 500),
    retry: false,
  });

  const list = useMemo(() => calls ?? [], [calls]);
  const costsByAttempt = useMemo(() => {
    const map = new Map<string, number>();
    for (const cost of costs.data?.items ?? []) {
      if (cost.attempt_id) map.set(cost.attempt_id, cost.total_cost);
      map.set(cost.call_uuid, cost.total_cost);
    }
    return map;
  }, [costs.data]);
  const totalsByCall = useMemo(() => {
    const map = new Map<string, { ai: number | null; plivo: number | null; total: number | null }>();
    for (const call of list) {
      const attempts = call.attempt_history ?? [];
      const aiValues = attempts.map((attempt) =>
        costsByAttempt.get(attempt.id) ??
        (attempt.plivo_call_uuid ? costsByAttempt.get(attempt.plivo_call_uuid) : undefined),
      );
      const plivoValues = attempts.map((attempt) => {
        const amount = attempt.total_amount == null ? Number.NaN : Number(attempt.total_amount);
        return Number.isFinite(amount) ? amount : null;
      });
      const ai = aiValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      const plivo = plivoValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      map.set(call.id, { ai, plivo, total: ai + plivo });
    }
    return map;
  }, [costsByAttempt, list]);
  const statuses = [...new Set(list.map((c) => c.status))].sort();
  const statusFilter = filter.startsWith("status:") ? filter.slice("status:".length) : null;
  const term = search.trim().toLowerCase();
  const filtered = list.filter(
    (c) =>
      (!statusFilter || c.status === statusFilter) &&
      (filter !== "messages:sent" || hasSentWhatsAppMessages(c)) &&
      (filter !== "messages:none" || !hasSentWhatsAppMessages(c)) &&
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
              <Select
                aria-label="Filter campaign calls"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full sm:w-48"
              >
                <option value="all">All calls</option>
                {statuses.map((s) => (
                  <option key={s} value={`status:${s}`}>
                    {humanize(s)} calls
                  </option>
                ))}
                <option value="messages:sent">Messages sent</option>
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
                  <CallRow
                    key={call.id}
                    call={call}
                    costs={totalsByCall.get(call.id)}
                    onOpen={() => setOpenId(call.id)}
                  />
                ))
              )}
            </Table>
            {costs.isError && (
              <p role="alert" className="px-4 text-xs text-loss">
                Could not load AI costs: {costs.error.message}
              </p>
            )}
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

function CallRow({
  call,
  costs,
  onOpen,
}: {
  call: ScheduledCampaignCall;
  costs: { ai: number | null; plivo: number | null; total: number | null } | undefined;
  onOpen: () => void;
}) {
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
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">{talkSeconds(call) ? formatDuration(talkSeconds(call)) : <span className="text-faint">—</span>}</td>
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">{formatMoney(costs?.plivo ?? 0, 4)}</td>
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">₹{formatMoney(costs?.ai ?? 0, 4)}</td>
      <td className="tnum whitespace-nowrap px-4 py-3 font-semibold text-heading">{formatMoney(costs?.total ?? 0, 4)}</td>
    </tr>
  );
}

/**
 * One lead's call: its attempts (newest first) with billing, recording and transcript,
 * plus recording an outcome while the call is live
 */
function CallDrawer({ campaignId, call, onClose }: { campaignId: string; call: ScheduledCampaignCall; onClose: () => void }) {
  const postOutcome = usePostCampaignCallOutcome();
  const costs = useQuery({
    queryKey: ["call-costs", "list", 1, 500],
    queryFn: () => getCallCosts(1, 500),
    retry: false,
  });
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
          attempts.map((a) => (
            <AttemptCard
              key={a.id}
              attempt={a}
              aiCost={findAttemptAiCost(costs.data?.items, a)}
              aiCostError={costs.isError ? costs.error.message : null}
            />
          ))
        )}
      </section>
    </Drawer>
  );
}

function findAttemptAiCost(costs: CallCost[] | undefined, attempt: CallAttempt) {
  return costs?.find(
    (cost) =>
      cost.attempt_id === attempt.id ||
      (!!attempt.plivo_call_uuid && cost.call_uuid === attempt.plivo_call_uuid),
  )?.total_cost;
}

function AttemptCard({
  attempt: a,
  aiCost,
  aiCostError,
}: {
  attempt: CallAttempt;
  aiCost: number | undefined;
  aiCostError: string | null;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const transcript = a.transcript ?? [];
  const transferred = ["completed", "success", "answered", "transferred"].includes((a.transfer_status ?? "").toLowerCase());
  const plivoCost = a.total_amount == null ? undefined : Number(a.total_amount);
  const combinedCost = plivoCost !== undefined && Number.isFinite(plivoCost) && aiCost !== undefined
    ? plivoCost + aiCost
    : undefined;

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
        <section className="space-y-3">
          <h4 className="eyebrow">WhatsApp messages sent</h4>
          {(a.whatsapp_messages?.length ?? 0) === 0 ? (
            <p className="rounded-md bg-raised px-4 py-4 text-sm text-muted">No WhatsApp messages sent for this attempt.</p>
          ) : (
            a.whatsapp_messages?.map((message) => (
              <article key={message.id} className="rounded-lg border border-hairline bg-surface p-4">
                <DetailList
                  columns={3}
                  items={[
                    { label: "Message", value: message.message_name || "WhatsApp message" },
                    { label: "Status", value: message.status ? <StatusBadge status={message.status} /> : "—" },
                    { label: "Delivered at", value: formatDate(message.delivered_at) },
                    { label: "Read at", value: formatDate(message.read_at) },
                  ]}
                />
              </article>
            ))
          )}
        </section>

        <DetailList
          columns={3}
          items={[
            { label: "Plivo cost", value: <span className="tnum">{plivoCost !== undefined && Number.isFinite(plivoCost) ? formatMoney(plivoCost, 4) : "—"}</span> },
            { label: "AI cost", value: <span className="tnum">{aiCost !== undefined ? `₹${formatMoney(aiCost, 4)}` : "—"}</span> },
            { label: "Total cost (Plivo + AI)", value: <span className="tnum font-semibold">{combinedCost !== undefined ? formatMoney(combinedCost, 4) : "—"}</span> },
          ]}
        />
        <DetailList
          columns={3}
          items={[
            { label: "Duration", value: <span className="tnum">{a.duration_seconds ? formatDuration(a.duration_seconds) : "—"}</span> },
            { label: "Hang-up", value: a.hangup_cause_name ? `${a.hangup_cause_name}${a.hangup_source ? ` (by ${a.hangup_source.toLowerCase()})` : ""}` : "—" },
            { label: "Transfer", value: a.transfer_status ? `${humanize(a.transfer_status)}${a.transfer_reason ? ` — ${a.transfer_reason}` : ""}` : "None" },
            { label: "Plivo status", value: a.plivo_status ? humanize(a.plivo_status) : "—" },
          ]}
        />
        {aiCostError && (
          <p role="alert" className="text-xs text-loss">
            Could not load AI cost: {aiCostError}
          </p>
        )}

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
