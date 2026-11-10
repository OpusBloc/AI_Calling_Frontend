"use client";

import { Suspense, useMemo, useState } from "react";
import {  useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
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

import { deleteCampaign } from "@/lib/api";
import type { CampaignCallDetailAttempt, CampaignCallSummary, CampaignCallsSummary, CallOutcome, Campaign, CampaignReport } from "@/types/types";
import {
  useAgents,
  useCampaign,
  useCampaignCallDetail,
  useCampaignCalls,
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
import type { ClassificationCall, ClassificationCallsResponse } from "@/lib/callingAgentApi";


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
type SortKey = "talk" | "plivo" | "ai" | "total";
const CLASSIFICATION_BAR_COLORS = [
  "#279be8",
  "#a43be0",
  "#20b98b",
  "#efa512",
] as const;
// Must match the backend: an outcome can only be recorded while a call is live
const ACTIVE = new Set(["dialing", "ringing", "in_progress"]);
const formatDateWithSeconds = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })
    : "—";
const getCampaignAiCost = (report: CampaignReport | undefined) =>
  (report?.calls ?? []).reduce((total, call) => total + call.sarvam_cost, 0);

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "costs", label: "Costs", icon: IndianRupee },
  { id: "classification", label: "Classification", icon: Tags },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

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
 const costCalls = useCampaignCalls(id, campaignQuery.isSuccess && (tab === "costs" || tab === "overview"));
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
        description={
          <span className="flex flex-wrap items-center gap-x-1.5">
            <span>Created {new Date(campaign.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}</span>
            <span aria-hidden>|</span>
            <span>Updated {new Date(campaign.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}</span>
            <span aria-hidden>|</span>
            
            <span className="tnum text-xs text-muted">
               {(campaign.plivo_pool_ids ?? []).length} Plivo pool{(campaign.plivo_pool_ids ?? []).length === 1 ? "" : "s"}
            </span>
          </span>
        }
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
{tab === "overview" && <Overview campaignId={id} report={report.data} callsSummary={costCalls.data?.summary} callsLoading={costCalls.isLoading} loading={report.isLoading} error={report.isError ? (report.error as Error).message : null} onRetry={() => report.refetch()} lastSchedule={schedule.data} />}
          {tab === "calls" && (
            <CallsCard
              campaignId={id}
              calls={report.data?.calls}
              loading={report.isLoading}
              error={report.isError ? (report.error as Error).message : null}
              onRetry={() => report.refetch()}
            />
          )}
          {tab === "costs" && (
            <CampaignCosts
              calls={costCalls.data?.calls}
              summary={costCalls.data?.summary}
              callsLoading={costCalls.isLoading}
              totalAiCost={getCampaignAiCost(report.data)}
              totalPlivoBilling={report.data?.summary.total_billing}
              billingLoading={report.isLoading}
            />
          )}
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
                  <span className="line-clamp-2 min-h-8 break-words text-xs font-medium text-heading">
                    {bar.name.replaceAll("_", " ")}
                  </span>
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
      campaignId={campaignId}
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
      campaignId={campaignId}
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
  campaignId,
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
  campaignId: string;
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
  const calls = useMemo(() => data?.calls ?? [], [data?.calls]);
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const [search, setSearch] = useState("");
  const [durationOrder, setDurationOrder] = useState<"normal" | "desc" | "asc">("normal");
  const [selectedCall, setSelectedCall] = useState<ClassificationCall | null>(null);
  const [lastOpenedCallId, setLastOpenedCallId] = useState<string | null>(null);
  const visibleCalls = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = calls
      .filter((call) => !term || [call.name, call.phone, call.status, call.classification]
        .some((value) => value?.toLowerCase().includes(term)));
    if (durationOrder === "normal") return filtered;
    return filtered.sort((a, b) => {
        const aDuration = a.duration_seconds ?? -1;
        const bDuration = b.duration_seconds ?? -1;
        if (aDuration < 0) return bDuration < 0 ? 0 : 1;
        if (bDuration < 0) return -1;
        return durationOrder === "desc" ? bDuration - aDuration : aDuration - bDuration;
      });
  }, [calls, durationOrder, search]);

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
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput value={search} onChange={(value) => { setSearch(value); onPageChange(1); }} placeholder="Search name, number or status" className="w-full sm:w-72" />
            </div>
            <Table head={[
              "Name",
              "Mobile number",
              "Status",
              <SortHead
                key="duration-sort"
                label="Duration"
                active={durationOrder !== "normal"}
                dir={durationOrder === "normal" ? null : durationOrder}
                ariaSort={durationOrder === "normal" ? "none" : durationOrder === "asc" ? "ascending" : "descending"}
                onClick={() => setDurationOrder((order) => order === "normal" ? "desc" : order === "desc" ? "asc" : "normal")}
              />,
              "Time",
            ]} label={`${title} calls`}>
              {visibleCalls.length === 0 ? (
                <TableMessage cols={5}>No calls match your search.</TableMessage>
              ) : visibleCalls.map((call, index) => (
                <tr
                  key={call.call_uuid ?? call.attempt_id ?? `${page}-${index}`}
                  tabIndex={0}
                  onClick={() => {
                    setSelectedCall(call);
                    setLastOpenedCallId(call.call_uuid ?? call.attempt_id ?? `${page}-${index}`);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setSelectedCall(call);
                      setLastOpenedCallId(call.call_uuid ?? call.attempt_id ?? `${page}-${index}`);
                    }
                  }}
                  className={`cursor-pointer align-middle outline-none transition-colors ${
                    lastOpenedCallId === (call.call_uuid ?? call.attempt_id ?? `${page}-${index}`)
                      ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]"
                      : "hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_3px_0_0_var(--accent)]"
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-heading">
                    {call.name || "Unnamed caller"}
                    {lastOpenedCallId === (call.call_uuid ?? call.attempt_id ?? `${page}-${index}`) && (
                      <span className="ml-2 inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-text">
                        Last opened
                      </span>
                    )}
                  </td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">{call.phone || "—"}</td>
                  <td className="px-4 py-3">{call.status ? <StatusBadge status={call.status} /> : "—"}</td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">
                    {call.duration_seconds != null ? formatDuration(call.duration_seconds) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {formatDate(call.classified_at ?? call.ended_at)}
                  </td>
                </tr>
              ))}
            </Table>

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
      {selectedCall && (
        <ClassificationCallDrawer campaignId={campaignId} call={selectedCall} classificationName={title} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}

function ClassificationCallDrawer({
  campaignId,
  call,
  classificationName,
  onClose,
}: {
  campaignId: string;
  call: ClassificationCall;
  classificationName: string;
  onClose: () => void;
}) {
  const report = useCampaignReport(campaignId);
  const reportCalls = report.data?.calls ?? [];
  const normalizedPhone = (value: string | null | undefined) => value?.replace(/\D/g, "") ?? "";
  const matchedCampaignCall = reportCalls.find((item) => item.call_id === call.call_uuid)
    ?? reportCalls.find((item) => normalizedPhone(item.phone) === normalizedPhone(call.phone)
      && item.lead_name?.trim().toLowerCase() === call.name?.trim().toLowerCase())
    ?? reportCalls.find((item) => normalizedPhone(item.phone) === normalizedPhone(call.phone));
  const detailsCallId = matchedCampaignCall?.call_id ?? null;
  const details = useCampaignCallDetail(campaignId, detailsCallId);
  const callTime = call.classified_at ?? call.ended_at;

  return (
    <Drawer
      wide
      title={call.name || call.phone || "Call details"}
      description={call.phone || undefined}
      onClose={onClose}
    >
      <DetailList
        columns={2}
        items={[
          { label: "Name", value: call.name || "Unnamed caller" },
          { label: "Mobile number", value: <span className="tnum">{call.phone || "—"}</span> },
          { label: "Status", value: call.status ? <StatusBadge status={call.status} /> : "—" },
          { label: "Classification", value: call.classification || classificationName },
          { label: "Time", value: formatDate(callTime) },
          { label: "Classified at", value: formatDate(call.classified_at) },
          { label: "Ended at", value: formatDate(call.ended_at) },
          { label: "Transfer status", value: call.transfer_status ? humanize(call.transfer_status) : "—" },
          { label: "Call ID", value: <span className="break-all font-mono text-xs">{call.call_uuid || "—"}</span> },
        ]}
      />

      <section className="space-y-3">
        {report.isLoading || details.isLoading ? (
          <Loading label="Loading call details" />
        ) : report.isError ? (
          <ErrorState message={report.error.message} onRetry={() => report.refetch()} />
        ) : details.isError ? (
          <ErrorState message={details.error.message} onRetry={() => details.refetch()} />
        ) : !detailsCallId ? (
          <p className="rounded-md bg-raised p-3 text-sm text-muted">
            Could not match this lead to a campaign call record.
          </p>
        ) : details.data ? (
          <>
            <DetailList
              columns={2}
              items={[
                { label: "Attempts", value: <span className="tnum">{details.data.call.attempt_count} of {details.data.call.max_attempts}</span> },
                { label: "Called from", value: <span className="tnum">{details.data.call.caller_number || "—"}</span> },
                { label: "Created", value: formatDateWithSeconds(details.data.call.created_at) },
                { label: "Updated", value: formatDateWithSeconds(details.data.call.updated_at) },
                  { label: "Total cost", value: <span className="tnum">₹{formatMoney(details.data.call.total_plivo_cost + details.data.call.total_sarvam_cost, 2)}</span> },
              ]}
            />
            {call.reason && (
              <section className="mt-5 space-y-2">
                <h4 className="eyebrow">Classification reason</h4>
                <p className="whitespace-pre-wrap rounded-md bg-raised p-3 text-sm text-body">{call.reason}</p>
              </section>
            )}
            <div className="space-y-3">
              {details.data.attempts.map((attempt) => <AttemptCard key={attempt.attempt_id} attempt={attempt} showDuration={false} showRecordingUrl={false} />)}
            </div>
            {call.audio && details.data.attempts.every((attempt) => !attempt.recording_url) && (
              <section className="space-y-2">
                <h4 className="eyebrow">Recording</h4>
                <audio controls preload="none" src={call.audio} className="w-full">
                  Your browser does not support audio.
                </audio>
              </section>
            )}
          </>
        ) : null}
      </section>

    </Drawer>
  );
}

/* -------------------------------- Overview -------------------------------- */

function Overview({
  campaignId,
  report,
  callsSummary,
  callsLoading,
  loading,
  error,
  onRetry,
  lastSchedule,
}: {
  campaignId: string;
  report: CampaignReport | undefined;
  callsSummary?: CampaignCallsSummary;
  callsLoading: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  lastSchedule: ReturnType<typeof useScheduleCampaign>["data"];
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  const s = report?.summary;
  const v = (n: React.ReactNode) => (loading || !s ? "—" : n);
  const pct = (n: number) => (s && s.total_calls ? ` · ${Math.round((n / s.total_calls) * 100)}%` : "");
  const aiCost = callsSummary?.ai_costs?.total_cost_inr_including_tax;
  const plivoBilling = callsSummary?.total_plivo_cost_inr;
  const totalCampaignCost =
    aiCost !== undefined && plivoBilling !== undefined ? aiCost + plivoBilling : undefined;
  const c = (n: React.ReactNode) => (callsLoading || callsSummary === undefined ? "—" : n);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Leads to call" value={v(s?.total_calls)} icon={<PhoneCall size={16} />} hint={s ? `${s.queued_calls} still queued` : undefined} />
        <StatTile label="Calls made" value={c(callsSummary?.total_calls_made)} icon={<PhoneCall size={16} />} hint="Across all attempts" />
        <StatTile label="Answered" value={v(s?.answered_calls)} icon={<CheckCircle2 size={16} />} hint={s ? `Completed or hung up${pct(s.answered_calls)}` : undefined} />
        <StatTile label="Transferred" value={v(s?.transferred_calls)} icon={<PhoneForwarded size={16} />} hint={s ? `Handed to a transfer agent${pct(s.transferred_calls)}` : undefined} />
        <StatTile label="Not reached" value={v(s?.failed_calls)} icon={<PhoneOff size={16} />} hint={s ? `Failed, busy or no answer${pct(s.failed_calls)}` : undefined} />
        <StatTile label="Live right now" value={v(s?.live_calls)} icon={<Radio size={16} />} hint="Dialing, ringing or talking" />
        <StatTile label="Talk time" value={v(formatDuration(s?.total_call_seconds))} icon={<Clock size={16} />} hint={s ? `${s.total_call_minutes} min across all attempts` : undefined} />
        <StatTile label="Plivo billing" value={c(formatMoney(plivoBilling, 2))} icon={<Receipt size={16} />} hint="Telephony charges, as billed by Plivo" />
<StatTile label="AI cost" value={c(formatMoney(aiCost, 2))} icon={<IndianRupee size={16} />} hint="STT, LLM, TTS and tax" />
<StatTile label="Total campaign cost" value={c(totalCampaignCost === undefined ? "—" : formatMoney(totalCampaignCost, 2))} icon={<IndianRupee size={16} />} hint="AI cost + Plivo billing" />
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
  calls: CampaignCallSummary[] | undefined;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();
const openId = searchParams.get("call"); // popup is open when this is set
const [selectedCallId, setSelectedCallId] = useState<string | null>(null); // "Last opened" highlight

const openCall = (callId: string) => {
  const params = new URLSearchParams(searchParams.toString()); // keeps tab=calls
  params.set("call", callId);
  params.set("api_method", "GET");
  params.set("api_endpoint", `/api/campaigns/${encodeURIComponent(campaignId)}/calls/${encodeURIComponent(callId)}`);
  router.push(`${pathname}?${params.toString()}`, { scroll: false });
};

const closeCall = () => {
  const params = new URLSearchParams(searchParams.toString());
  params.delete("call");
  params.delete("api_method");
  params.delete("api_endpoint");
  router.push(`${pathname}?${params.toString()}`, { scroll: false });
};

  const list = useMemo(() => calls ?? [], [calls]);
  const statuses = [...new Set(list.map((c) => c.status))].sort();
  const statusFilter = filter.startsWith("status:") ? filter.slice("status:".length) : null;
  const term = search.trim().toLowerCase();
  const filtered = list.filter(
    (c) =>
      (!statusFilter || c.status === statusFilter) &&
      (filter !== "messages:sent" || c.has_whatsapp_messages) &&
      (!term || `${c.lead_name ?? ""} ${c.phone}`.toLowerCase().includes(term)),
  );
  const activeSort = sort;
  const sortedCalls = activeSort
    ? [...filtered].sort((a, b) => {
        const value = (call: CampaignCallSummary) => {
          switch (activeSort.key) {
            case "talk":
              return call.total_talk_seconds;
            case "plivo":
              return call.plivo_cost;
            case "ai":
              return call.sarvam_cost;
            case "total":
              return call.plivo_cost + call.sarvam_cost;
          }
        };
        const difference = value(a) - value(b);
        return activeSort.dir === "asc" ? difference : -difference;
      })
    : filtered;
  const pagination = usePagination(sortedCalls, 25);
  const toggleSort = (key: SortKey) => {
    pagination.setPage(1);
    setSort((current) =>
      current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null,
    );
  };
  const head = [
    ...CALL_HEAD.slice(0, 3),
    ...([
      ["talk", "Talk time"],
      ["plivo", "Plivo cost"],
      ["ai", "AI cost"],
      ["total", "Total cost"],
    ] as const).map(([key, label]) => (
      <SortHead
        key={key}
        label={label}
        active={sort?.key === key}
        dir={sort?.key === key ? sort.dir : null}
        ariaSort={sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        onClick={() => toggleSort(key)}
      />
    )),
  ];
  const open = list.find((c) => c.call_id === openId) ?? null;

  return (
    <>
      <Card
        flush
        title="Calls"
        description="One row per lead. Open a call to see every attempt, its recording and the transcript. The last opened call stays highlighted after you close it."
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
            <Table bare head={head} label="Campaign calls">
              {loading ? (
                <SkeletonRows cols={CALL_HEAD.length} />
              ) : filtered.length === 0 ? (
                <TableMessage cols={CALL_HEAD.length}>No calls match your filters.</TableMessage>
              ) : (
                pagination.pageItems.map((call) => (
                  <CallRow
                    key={call.call_id}
                    call={call}
                    selected={call.call_id === selectedCallId}
                    onOpen={() => {
                      setSelectedCallId(call.call_id);
                      openCall(call.call_id);
                    }}
                  />
                ))
              )}
            </Table>
            <div className="px-4">
              <Pagination {...pagination} noun="calls" />
            </div>
          </div>
        )}
      </Card>

      {open && <CallDrawer campaignId={campaignId} call={open} onClose={closeCall} />}
    </>
  );
}

function SortHead({
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
      aria-label={`Sort by ${label}`}
      onClick={onClick}
      className={clsx(
        "inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active ? "text-heading" : "text-muted hover:text-heading",
      )}
    >
      <span>{label}</span>
      <SortIcon size={13} aria-hidden />
    </button>
  );
}

function CallRow({
  call,
  selected,
  onOpen,
}: {
  call: CampaignCallSummary;
  selected: boolean;
  onOpen: () => void;
}) {
  const live = ACTIVE.has(call.status.toLowerCase());
  return (
    <tr
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={`cursor-pointer align-middle outline-none transition-colors ${
        selected
          ? "bg-accent/10 shadow-[inset_3px_0_0_var(--accent)]"
          : "hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_3px_0_0_var(--accent)]"
      }`}
    >
      <td className="px-4 py-3 font-medium text-heading">
        {call.lead_name || <span className="text-faint">Unnamed</span>}
        {selected && (
          <span className="ml-2 inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-text">
            Last opened
          </span>
        )}
        {live && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-gain">
            <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-gain" /> Live
          </span>
        )}
      </td>
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">{call.phone}</td>
      <td className="px-4 py-3">
        <StatusBadge status={call.status} />
      </td>
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">{formatDuration(call.total_talk_seconds)}</td>
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">{formatMoney(call.plivo_cost, 2)}</td>
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">₹{formatMoney(call.sarvam_cost, 2)}</td>
      <td className="tnum whitespace-nowrap px-4 py-3 font-semibold text-heading">{formatMoney(call.plivo_cost + call.sarvam_cost, 2)}</td>
    </tr>
  );
}

function CallDrawer({
  campaignId,
  call,
  onClose,
}: {
  campaignId: string;
  call: CampaignCallSummary;
  onClose: () => void;
}) {
  const details = useCampaignCallDetail(campaignId, call.call_id);
  const postOutcome = usePostCampaignCallOutcome();
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const callDetail = details.data?.call;
  const live = callDetail ? ACTIVE.has(callDetail.status.toLowerCase()) : false;
  const attempts = [...(details.data?.attempts ?? [])].sort((a, b) => b.attempt_no - a.attempt_no);

  const save = () => {
    if (!outcome) return;
    postOutcome.mutate(
      { campaignId, callId: call.call_id, outcome },
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
    <Drawer wide title="Call details" onClose={onClose}>
      {details.isLoading ? (
        <Loading label="Loading call details" />
      ) : details.isError ? (
        <ErrorState message={details.error.message} onRetry={() => details.refetch()} />
      ) : callDetail ? (
        <>
          <DetailList
            columns={3}
            items={[
              { label: "Attempts", value: <span className="tnum">{callDetail.attempt_count} of {callDetail.max_attempts}</span> },
              { label: "Scheduled_At", value: formatDateWithSeconds(callDetail.scheduled_at) },
              { label: "Called from", value: <span className="tnum">{callDetail.caller_number ?? "—"}</span> },
              { label: "Created", value: formatDateWithSeconds(callDetail.created_at) },
              { label: "Updated", value: formatDateWithSeconds(callDetail.updated_at) },
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
              attempts.map((attempt) => <AttemptCard key={attempt.attempt_id} attempt={attempt} />)
            )}
          </section>

        </>
      ) : null}
    </Drawer>
  );
}

function formatHangupCause(attempt: CampaignCallDetailAttempt): string {
  const cause = attempt.plivo.hangup_cause_name?.trim();
  if (!cause) return "—";

  const readSource = (record: Record<string, unknown> | null | undefined) => {
    if (!record) return null;
    const value = record.hangup_source ?? record.hangupSource ?? record.HangupSource;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  const rawSource = attempt.plivo.hangup_source
    ?? readSource(attempt.plivo.cdr)
    ?? readSource(attempt.plivo.callback);

  if (!rawSource || /\(by\s+[^)]+\)$/i.test(cause)) return cause;
  const source = rawSource.replace(/^by\s+/i, "").toLowerCase();
  return `${cause} (by ${source})`;
}

function AttemptCard({
  attempt: a,
  showDuration = true,
  showRecordingUrl = true,
}: {
  attempt: CampaignCallDetailAttempt;
  showDuration?: boolean;
  showRecordingUrl?: boolean;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  const transcript = a.transcript ?? [];
  const whatsappMessages = a.whatsapp_messages ?? [];
  const transferred = ["completed", "success", "answered", "transferred"].includes((a.transfer_status ?? "").toLowerCase());
  const plivoCost = a.plivo.cost_inr;
  const aiCost = a.sarvam?.total_cost_inr ?? 0;
  const combinedCost = plivoCost + aiCost;
  const hangupCause = formatHangupCause(a);

  return (
    <article className="rounded-lg border border-hairline bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="tnum text-sm font-semibold text-heading">Attempt {a.attempt_no}</span>
          <StatusBadge status={a.status} />
          {transferred && <Badge tone="gain">Transferred</Badge>}
        </div>
        <span className="text-xs text-muted">{formatDateWithSeconds(a.ended_at ?? a.submitted_at)}</span>
      </header>

      <div className="space-y-4 p-4">
        <section className="space-y-3">
          <h4 className="eyebrow">WhatsApp messages sent</h4>
          {whatsappMessages.length === 0 ? (
            <p className="rounded-md bg-raised px-4 py-4 text-sm text-muted">No WhatsApp messages sent for this attempt.</p>
          ) : (
            whatsappMessages.map((message) => (
              <article key={message.id} className="rounded-lg border border-hairline bg-surface p-4">
                <DetailList
                  columns={3}
                  items={[
                    { label: "Message", value: message.message_name || "WhatsApp message" },
                    { label: "Status", value: message.status ? <StatusBadge status={message.status} /> : "—" },
                    { label: "Delivered at", value: formatDateWithSeconds(message.delivered_at) },
                    { label: "Read at", value: formatDateWithSeconds(message.read_at) },
                  ]}
                />
              </article>
            ))
          )}
        </section>

        <DetailList
          columns={3}
          items={[
            { label: "Plivo cost", value: <span className="tnum">₹{formatMoney(plivoCost, 2)}</span> },
            { label: "AI cost", value: <span className="tnum">₹{formatMoney(aiCost, 2)}</span> },
            { label: "Total cost (Plivo + AI)", value: <span className="tnum font-semibold">₹{formatMoney(combinedCost, 2)}</span> },
          ]}
        />
        <DetailList
          columns={3}
          items={[
            { label: "Caller number", value: <span className="tnum">{a.caller_number ?? "—"}</span> },
            ...(showDuration ? [{ label: "Duration", value: <span className="tnum">{a.duration_seconds ? formatDuration(a.duration_seconds) : "—"}</span> }] : []),
            { label: "Submitted", value: formatDateWithSeconds(a.submitted_at) },
            { label: "Ended", value: formatDateWithSeconds(a.ended_at) },
            { label: "Hang-up", value: hangupCause },
            { label: "Transfer", value: a.transfer_status ? `${humanize(a.transfer_status)}${a.transfer_reason ? ` — ${a.transfer_reason}` : ""}` : "None" },
            { label: "Transfer reason", value: a.transfer_reason ?? "—" },
            { label: "Plivo status", value: a.plivo.status ? humanize(a.plivo.status) : "—" },
            { label: "Machine detected", value: a.plivo.machine_detected == null ? "—" : String(a.plivo.machine_detected) },
          ]}
        />

        <section className="space-y-2">
          <h4 className="eyebrow">Recording</h4>
          {a.recording_url ? (
            <>
              {showRecordingUrl && <p className="break-all text-xs text-muted">{a.recording_url}</p>}
              <audio controls preload="none" src={a.recording_url} className="w-full">
                <a href={a.recording_url}>Download recording</a>
              </audio>
            </>
          ) : (
            <p className="rounded-md bg-raised px-4 py-3 text-sm text-muted">No recording is available for this attempt.</p>
          )}
        </section>

        <section className="space-y-2">
          <h4 className="eyebrow">Transcript</h4>
          {transcript.length > 0 ? (
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
          ) : (
            <p className="rounded-md bg-raised px-4 py-3 text-sm text-muted">No transcript is available for this attempt.</p>
          )}
        </section>

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
            {
              label: "Start",
              value: campaign.start_at
                ? new Date(campaign.start_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })
                : "—",
            },
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
