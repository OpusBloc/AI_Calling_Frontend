"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {  useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Copy,
  Clock,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  Bot,
  IndianRupee,
  LayoutDashboard,
  Pause,
  Pencil,
  PhoneCall,
  Phone,
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
import type { CampaignCallDetailAttempt, CampaignCallSummary, CampaignCallsResponse, CampaignCallbacksResponse, CampaignCallsSummary, CallOutcome, Campaign, CampaignReport, PlivoPool } from "@/types/types";
import {
  useAgents,
  useCampaign,
  useCampaignCallDetail,
  useCampaignCallbacks,
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
import { formatDays, formatWindow } from "@/features/campaigns/components/CampaignsTab";
import DispatchPanel, { useToggleDispatch } from "@/features/campaigns/components/DispatchPanel";
import CampaignCosts from "@/features/campaigns/components/CampaignCosts";
import SelectMenu from "@/components/SelectMenu";
import { PAGE_SIZE } from "@/lib/constants";
import StatCard from "@/features/dashboard/components/StatCard";
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
  SearchInput,
  Select,
  StatusBadge,
  Table,
  TableMessage,
  Tabs,
  formatDate,
  formatDuration,
  formatMoney,
  humanize,
  useTabParam,
} from "@/components/ui";
import { CallDetailsSkeleton, CampaignClassificationSkeleton, CampaignDetailSkeleton, ChartSkeleton, SkeletonBoundary, TableSkeleton, useSkeletonVisibility } from "@/components/skeletons";
import { CALL_COLUMNS } from "@/components/skeletons/table-columns";

const OUTCOMES: CallOutcome[] = ["completed", "no_answer", "not_connected", "busy", "failed", "hung_up", "cancelled"];
const CALL_HEAD = CALL_COLUMNS.map((column) => column.label);
const formatCallbackAtIST = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h12",
    timeZone: "Asia/Kolkata",
  }).format(date);
};
type SortKey = "talk" | "plivo" | "ai" | "total";
const CLASSIFICATION_BAR_COLORS = [
  "var(--classification-series-1)",
  "var(--classification-series-2)",
  "var(--classification-series-3)",
  "var(--classification-series-4)",
] as const;
const CLASSIFICATION_COLORS: Record<string, string> = {
  "call disconnected": "#2a8be6",
  "call again": "#a23fd8",
  "not answered": "#e879a8",
  unclassified: "#1db88a",
  "not interested": "#f0a40c",
  "wrong number": "#ef6c3a",
  interested: "#15965f",
};
const CLASSIFICATION_FALLBACK_COLORS = ["#7c63d8", "#0f9fb5", "#c84d75", "#697b35", "#82624d", "#5268c9"] as const;
// Must match the backend: an outcome can only be recorded while a call is live
const ACTIVE = new Set(["dialing", "ringing", "in_progress"]);
const displayAttemptText = (value: string | null | undefined) => {
  const text = value?.trim();
  return !text || text.startsWith("\u00e2\u20ac") || text.startsWith("\u00e2\u0080")
    ? "Not available"
    : text;
};
const formatDateWithSeconds = (value: string | null | undefined) => {
  const text = displayAttemptText(value);
  if (text === "Not available") return text;
  const date = new Date(text);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
};
const formatInitiationTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
};
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
    <Suspense fallback={<CampaignDetailSkeleton />}>
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
  const plivoPools = usePlivoPools();
  const report = useCampaignReport(id, campaignQuery.isSuccess);
 const costCalls = useCampaignCalls(id, campaignQuery.isSuccess && (tab === "costs" || tab === "overview" || tab === "calls"));
  const schedule = useScheduleCampaign();
  const campaign = campaignQuery.data;
  const dispatch = useToggleDispatch(id, campaign?.name ?? "Campaign");
  const pageLoading = ids.isLoading || (exists && campaignQuery.isLoading);
  const showPageSkeleton = useSkeletonVisibility(pageLoading);

  const remove = useMutation({
    mutationFn: () => deleteCampaign(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
      showSuccessNotification(`"${campaign?.name}" was deleted.`, { title: "Campaign deleted" });
      router.replace("/campaigns");
    },
  });

  const backButton = (
    <button
      type="button"
      aria-label="Back to campaigns"
      title="Back to campaigns"
      onClick={() => router.push("/?tab=campaigns")}
      className="btn-blue-filled mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ArrowLeft size={18} aria-hidden="true" />
    </button>
  );

  if (pageLoading || showPageSkeleton) return showPageSkeleton ? <CampaignDetailSkeleton /> : null;

  if (ids.isError || campaignQuery.isError) {
    const err = (ids.error ?? campaignQuery.error) as Error;
    return (
      <div className="space-y-6">
        <PageHeader title="Campaign" leading={backButton} />
        <ErrorState message={err.message} onRetry={() => (ids.isError ? ids.refetch() : campaignQuery.refetch())} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campaign not found" leading={backButton} />
        <EmptyState
          title="This campaign doesn't exist"
          text="It may have been deleted, or the link is wrong."
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
      <Button className="btn-blue-filled" onClick={handleSchedule} loading={schedule.isPending}>
        {!schedule.isPending && <CalendarClock size={16} aria-hidden />} Schedule calls
      </Button>
    ) : campaign.status === "scheduled" || campaign.status === "running" ? (
      <Button variant="secondary" className="btn-blue" onClick={() => dispatch.toggle(false)} loading={dispatch.pending}>
        {!dispatch.pending && <Pause size={16} aria-hidden />} Pause calls
      </Button>
    ) : campaign.status === "paused" ? (
      <Button className="btn-blue-filled" onClick={() => dispatch.toggle(true)} loading={dispatch.pending}>
        {!dispatch.pending && <Play size={16} aria-hidden />} Resume calls
      </Button>
    ) : null;

  const callCount = report.data?.summary.total_calls;

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        leading={backButton}
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
            <Button variant="secondary" onClick={handleDelete} loading={remove.isPending} className="btn-red">
              <Trash2 size={16} aria-hidden /> Delete
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/campaigns/${id}/edit`)} className="btn-blue">
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
              callRecords={costCalls.data?.calls}
              pools={plivoPools.data}
              poolIds={campaign.plivo_pool_ids ?? []}
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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
          <Button variant="secondary" className="btn-blue h-11 w-full min-w-0 sm:w-auto" onClick={() => router.push("/?tab=campaigns")}>
            Cancel
          </Button>
          <Button
            className="btn-blue-filled h-11 w-full min-w-0 sm:w-auto"
            disabled={tab === TABS[TABS.length - 1].id}
            onClick={() => {
              const activeIndex = TABS.findIndex((item) => item.id === tab);
              const nextTab = TABS[activeIndex + 1];
              if (nextTab) setTab(nextTab.id);
            }}
          >
            Next
          </Button>
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [graphPage, setGraphPage] = useState(1);
  const loading = summary.status === "pending" || configured.isLoading || agents.isLoading;
  const showLoading = useSkeletonVisibility(loading);

  if (loading || showLoading) return showLoading ? <ChartSkeleton height="h-72" /> : null;

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
  const totalClassifiedCalls = bars.reduce((total, bar) => total + bar.calls, 0);
  const donutItems = [...bars]
    .sort((a, b) => b.calls - a.calls)
    .map((bar, index) => {
      const key = bar.name.replaceAll("_", " ").trim().toLowerCase();
      return { ...bar, color: CLASSIFICATION_COLORS[key] ?? CLASSIFICATION_FALLBACK_COLORS[index % CLASSIFICATION_FALLBACK_COLORS.length] };
    });
  const circumference = 2 * Math.PI * 60;
  const noCallValues = bars.every((bar) => bar.calls === 0);
  const maxCalls = Math.max(1, ...bars.map((bar) => bar.calls));
  const graphPageSize = 10;
  const graphPageCount = Math.max(1, Math.ceil(bars.length / graphPageSize));
  const graphBars = bars.slice((graphPage - 1) * graphPageSize, graphPage * graphPageSize);
  const yTicks = [...new Set([maxCalls, Math.ceil(maxCalls * 0.75), Math.ceil(maxCalls * 0.5), Math.ceil(maxCalls * 0.25), 0])];

  return (
    <>
    <Card
      title="Call classifications"
      description={(
        <>
          <span className="md:hidden">Tap a slice or a row to view its calls.</span>
          <span className="hidden md:inline">{summary.data.total_calls} calls grouped by classification. Select a bar to view its calls.</span>
        </>
      )}
      flush
      className="[&>div:first-child]:px-3.5 md:[&>div:first-child]:px-5"
    >
      <div className="p-3.5 md:p-5">
      <div className="md:hidden">
        <svg viewBox="0 0 200 200" className="mx-auto block w-full max-w-[220px] outline-none focus:outline-none focus-visible:outline-none" style={{ WebkitTapHighlightColor: "transparent" }} role="img" aria-label={`Donut chart of ${totalClassifiedCalls} calls across ${donutItems.length} classifications`}>
          {totalClassifiedCalls > 0 ? (
            <>
              {donutItems.reduce<{ offset: number; circles: ReactNode[] }>((acc, item) => {
                const segmentLength = (item.calls / totalClassifiedCalls) * circumference;
                const isSelected = Boolean(selected && selected.id === item.id && selected.name === item.name);
                acc.circles.push(
                  <circle
                    key={item.id ?? item.name}
                    cx="100"
                    cy="100"
                    r="60"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="28"
                    strokeDasharray={`${Math.max(0, segmentLength - 1.5)} ${circumference - Math.max(0, segmentLength - 1.5)}`}
                    strokeDashoffset={-acc.offset}
                    transform="rotate(-90 100 100)"
                    opacity={selected && !isSelected ? 0.3 : 1}
                    className="cursor-pointer transition-opacity outline-none focus:outline-none focus-visible:outline-none"
                    style={{ WebkitTapHighlightColor: "transparent" }}
                    aria-hidden="true"
                    onClick={() => setSelected((current) => current && current.id === item.id && current.name === item.name ? null : { id: item.id, name: item.name })}
                  />,
                );
                acc.offset += segmentLength;
                return acc;
              }, { offset: 0, circles: [] }).circles}
              {selected ? (
                <>
                  <text x="100" y="96" textAnchor="middle" className="fill-heading font-mono text-[26px] font-medium">{donutItems.find((item) => item.id === selected.id && item.name === selected.name)?.calls ?? 0}</text>
                  <text x="100" y="116" textAnchor="middle" fontSize={selected.name.length > 16 ? 8 : 11} className="fill-muted">{selected.name.replaceAll("_", " ")}</text>
                </>
              ) : (
                <>
                  <text x="100" y="96" textAnchor="middle" className="fill-heading font-mono text-[26px] font-medium">{totalClassifiedCalls}</text>
                  <text x="100" y="116" textAnchor="middle" className="fill-muted text-[11px]">calls</text>
                </>
              )}
            </>
          ) : (
            <>
              <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="28" className="text-hairline outline-none focus:outline-none focus-visible:outline-none" style={{ WebkitTapHighlightColor: "transparent" }} aria-hidden="true" />
              <text x="100" y="104" textAnchor="middle" className="fill-muted text-[11px]">No calls yet</text>
            </>
          )}
        </svg>
        <div className="mt-3 space-y-1">
          {donutItems.map((item) => {
            const isSelected = Boolean(selected && selected.id === item.id && selected.name === item.name);
            const percentage = totalClassifiedCalls ? (item.calls / totalClassifiedCalls) * 100 : 0;
            return (
              <div key={item.id ?? item.name}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected((current) => current && current.id === item.id && current.name === item.name ? null : { id: item.id, name: item.name })}
                  className={clsx(
                    "flex min-h-[48px] w-full items-center gap-2.5 rounded-md border px-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isSelected ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40" : "border-transparent hover:bg-surface-hover",
                  )}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm text-heading">{item.name.replaceAll("_", " ")}</span>
                  <span className="tnum shrink-0 font-mono font-medium text-heading">{item.calls}</span>
                  <span className="w-10 shrink-0 text-right text-xs text-muted">{percentage > 0 && percentage < 1 ? "<1%" : `${Math.round(percentage)}%`}</span>
                </button>
                {isSelected && (
                  <Button
                    className="btn-blue-filled mt-1 min-h-[44px] w-full"
                    onClick={() => setDetailsOpen(true)}
                  >
                    View details
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="hidden md:block">
      <div
        role="group"
        aria-label="Calls by classification"
        className="no-scrollbar flex min-h-64 gap-2 overflow-x-auto px-2 pb-2 pt-5"
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
            style={{ gridTemplateColumns: `repeat(${graphBars.length}, minmax(0, 1fr))` }}
          >
            {graphBars.map((bar, pageIndex) => {
              const index = (graphPage - 1) * graphPageSize + pageIndex;
              const color = CLASSIFICATION_BAR_COLORS[index % CLASSIFICATION_BAR_COLORS.length];
              const barHeight = noCallValues ? 28 + ((index * 37 + 19) % 58) : Math.max(5, (bar.calls / maxCalls) * 100);
              return (
                <button
                  key={bar.id ?? "unclassified"}
                  type="button"
                  onClick={() => {
                    setSelected({ id: bar.id, name: bar.name });
                    setDetailsOpen(true);
                  }}
                  aria-label={`View ${bar.calls} calls for ${bar.name}`}
                  className="group grid h-56 w-full grid-rows-[10rem_2rem] justify-items-center gap-2 rounded-md text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                  <span className="line-clamp-2 min-h-8 w-full break-words px-0.5 text-xs font-medium leading-normal text-heading">
                    {bar.name.replaceAll("_", " ")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      {graphPageCount > 1 && (
        <div className="mt-3 hidden items-center justify-end gap-2 border-t border-hairline px-2 pt-3 text-sm text-muted md:flex">
          <Button size="sm" className="btn-blue-filled" onClick={() => setGraphPage((current) => Math.max(1, current - 1))} disabled={graphPage <= 1}>
            Previous graph
          </Button>
          <span className="shrink-0 whitespace-nowrap">Graph page {graphPage} of {graphPageCount}</span>
          <Button size="sm" className="btn-blue-filled" onClick={() => setGraphPage((current) => Math.min(graphPageCount, current + 1))} disabled={graphPage >= graphPageCount}>
            Next graph
          </Button>
        </div>
      )}
      {noCallValues && (
        <p className="hidden px-5 pb-4 text-center text-xs text-muted md:block">
          Placeholder bars show the available classifications. Values will appear when calls are classified.
        </p>
      )}
      </div>
    </Card>
    {detailsOpen && selected && (
      <Drawer full offsetSidebar title={selected.name === "Unclassified" ? "Unclassified calls" : selected.name.replaceAll("_", " ")} onClose={() => setDetailsOpen(false)}>
        {selected.id ? (
          <CampaignClassificationCalls
            campaignId={campaignId}
            classificationId={selected.id}
            classificationName={selected.name}
            totalCalls={bars.find((bar) => bar.id === selected.id)?.calls ?? 0}
            onBack={() => setDetailsOpen(false)}
          />
        ) : (
          <CampaignUnclassifiedCalls campaignId={campaignId} totalCalls={bars.find((bar) => bar.id === null)?.calls ?? 0} onBack={() => setDetailsOpen(false)} />
        )}
      </Drawer>
    )}
    </>
  );
}

function CampaignClassificationCalls({
  campaignId,
  classificationId,
  classificationName,
  totalCalls,
  onBack,
}: {
  campaignId: string;
  classificationId: string;
  classificationName: string;
  totalCalls: number;
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const calls = useCampaignClassificationCalls(campaignId, classificationId, { page, page_size: pageSize });

  return (
    <ClassificationCallsPanel
      campaignId={campaignId}
      title={classificationName}
      data={calls.data}
      totalCalls={totalCalls}
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

function CampaignUnclassifiedCalls({ campaignId, totalCalls, onBack }: { campaignId: string; totalCalls: number; onBack: () => void }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const calls = useCampaignUnclassifiedCalls(campaignId, { page, page_size: pageSize });

  return (
    <ClassificationCallsPanel
      campaignId={campaignId}
      title="Unclassified calls"
      data={calls.data}
      totalCalls={totalCalls}
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
  totalCalls: fallbackTotal,
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
  totalCalls: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  const calls = useMemo(() => data?.calls ?? [], [data?.calls]);
  const total = Math.max(data?.total ?? 0, fallbackTotal);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const [search, setSearch] = useState("");
  const [durationOrder, setDurationOrder] = useState<"normal" | "desc" | "asc">("normal");
  const [selectedCall, setSelectedCall] = useState<ClassificationCall | null>(null);
  const showCallsSkeleton = useSkeletonVisibility(loading);
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
  const mobileCallItems = visibleCalls.map((call, index) => {
    const rowId = call.call_uuid ?? call.attempt_id ?? `${page}-${index}`;
    return {
      id: rowId,
      avatar: "",
      hideAvatar: true,
      title: call.name || "Unnamed caller",
      subtitle: call.phone || "-",
      badge: call.status ? <StatusBadge status={call.status} /> : undefined,
      keyValue: {
        label: "Duration",
        value: <span className="tnum">{call.duration_seconds != null ? formatDuration(call.duration_seconds) : "-"}</span>,
      },
      details: [
        { label: "Time", value: formatDate(call.classified_at ?? call.ended_at), fullWidth: true },
      ],
      actions: [
        {
          label: "View details",
          onClick: () => {
            setSelectedCall(call);
            setLastOpenedCallId(rowId);
          },
        },
      ],
    };
  });

  return (
    <div className="space-y-4">
      <Button className="btn-blue-filled" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> All classifications
      </Button>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-heading">{title}</h2>
            <p className="text-xs text-muted">{total} calls in this classification.</p>
          </div>
          <div className="blue-fields w-full sm:max-w-64">
            <SearchInput value={search} onChange={(value) => { setSearch(value); onPageChange(1); }} placeholder="Search name, number or status" className="w-full" />
          </div>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : loading || showCallsSkeleton ? (
          showCallsSkeleton ? <CampaignClassificationSkeleton /> : null
        ) : calls.length === 0 ? (
          <EmptyState title="No calls in this classification" text="No call records are available yet." />
        ) : (
            <div className="blue-fields space-y-4">
            <Table className="blue-table" head={[
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
            ]} label={`${title} calls`} mobileItems={mobileCallItems}>
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
                      ? "bg-[var(--primary-tint)] shadow-[inset_3px_0_0_var(--primary-marker)] "
                      : "hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_3px_0_0_var(--primary)] "
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-heading">
                    {call.name || "Unnamed caller"}
                    {lastOpenedCallId === (call.call_uuid ?? call.attempt_id ?? `${page}-${index}`) && (
                      <span className="ml-2 inline-flex rounded-full bg-[var(--primary-tint)] px-2 py-0.5 text-[10px] font-medium text-link">
                        Last opened
                      </span>
                    )}
                  </td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">{call.phone || "-"}</td>
                  <td className="px-4 py-3">{call.status ? <StatusBadge status={call.status} /> : "-"}</td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">
                    {call.duration_seconds != null ? formatDuration(call.duration_seconds) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {formatDate(call.classified_at ?? call.ended_at)}
                  </td>
                </tr>
              ))}
            </Table>

            <div className="flex flex-col gap-3 border-t border-hairline pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <span aria-live="polite">
                Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} calls
              </span>
            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span>Page {page} of {pageCount} · {total} calls</span>
                <div className="flex gap-2">
                  <Button size="sm" className="btn-blue-filled" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
                    Previous
                  </Button>
                  <Button size="sm" className="btn-blue-filled" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
                    Next
                  </Button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
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
        mobileTwoColumns
        items={[
          { label: "Name", value: call.name || "Unnamed caller", wide: (call.name?.length ?? 0) > 24 },
          { label: "Mobile number", value: <span className="tnum">{call.phone || "-"}</span>, wide: (call.phone?.length ?? 0) > 18 },
          { label: "Status", value: call.status ? <StatusBadge status={call.status} /> : "-" },
          { label: "Classification", value: call.classification || classificationName, wide: (call.classification?.length ?? classificationName.length) > 24 },
          { label: "Time", value: formatDate(callTime), wide: formatDate(callTime).length > 22 },
          { label: "Classified at", value: formatDate(call.classified_at), wide: formatDate(call.classified_at).length > 22 },
          { label: "Ended at", value: formatDate(call.ended_at), wide: formatDate(call.ended_at).length > 22 },
          { label: "Transfer status", value: call.transfer_status ? humanize(call.transfer_status) : "-", wide: (call.transfer_status?.length ?? 0) > 22 },
          { label: "Call ID", value: <span className="break-all font-mono text-xs">{call.call_uuid || "-"}</span>, wide: true },
        ]}
      />

      <section className="space-y-3">
        <SkeletonBoundary loading={report.isLoading || details.isLoading} skeleton={<CallDetailsSkeleton />}>
        {report.isError ? (
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
              mobileTwoColumns
              items={[
                { label: "Attempts", value: <span className="tnum">{details.data.call.attempt_count} of {details.data.call.max_attempts}</span> },
                { label: "Called from", value: <span className="tnum">{details.data.call.caller_number || "-"}</span> },
                { label: "Created", value: formatDateWithSeconds(details.data.call.created_at), wide: formatDateWithSeconds(details.data.call.created_at).length > 22 },
                { label: "Updated", value: formatDateWithSeconds(details.data.call.updated_at), wide: formatDateWithSeconds(details.data.call.updated_at).length > 22 },
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
              {details.data.attempts.map((attempt) => <AttemptCard key={attempt.attempt_id} attempt={attempt} showDuration={false} showRecordingUrl mobileTwoColumns />)}
            </div>
            {call.audio && details.data.attempts.every((attempt) => !attempt.recording_url) && (
              <section className="space-y-2">
                <h4 className="eyebrow">Recording</h4>
                <RecordingUrl value={call.audio} />
                <audio controls preload="none" src={call.audio} className="w-full">
                  Your browser does not support audio.
                </audio>
              </section>
            )}
          </>
        ) : null}
        </SkeletonBoundary>
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
  const v = (n: React.ReactNode) => (loading || !s ? "-" : n);
  const pct = (n: number) => (s && s.total_calls ? ` · ${Math.round((n / s.total_calls) * 100)}%` : "");
  const aiCost = callsSummary?.ai_costs?.total_cost_inr_including_tax;
  const plivoBilling = callsSummary?.total_plivo_cost_inr;
  const totalCampaignCost =
    aiCost !== undefined && plivoBilling !== undefined ? aiCost + plivoBilling : undefined;
  const c = (n: React.ReactNode) => (callsLoading || callsSummary === undefined ? "-" : n);
  return (
    <>
      <div className="grid auto-rows-fr grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Leads to call" value={v(s?.total_calls)} icon={<PhoneCall />} color="blue" loading={loading} subtext={s ? `${s.queued_calls} still queued` : undefined} />
        <StatCard title="Calls made" value={c(callsSummary?.total_calls_made)} icon={<PhoneCall />} color="pink" loading={callsLoading || callsSummary === undefined} subtext="Across all attempts" />
        <StatCard title="Answered" value={v(s?.answered_calls)} icon={<CheckCircle2 />} color="emerald" loading={loading} subtext={s ? `Completed or hung up${pct(s.answered_calls)}` : undefined} />
        <StatCard title="Transferred" value={v(s?.transferred_calls)} icon={<PhoneForwarded />} color="purple" loading={loading} subtext={s ? `To transfer agent${pct(s.transferred_calls)}` : undefined} />
        <StatCard title="Not reached" value={v(s?.failed_calls)} icon={<PhoneOff />} color="red" loading={loading} subtext={s ? `Failed or no answer${pct(s.failed_calls)}` : undefined} />
        <StatCard title="Live right now" value={v(s?.live_calls)} icon={<Radio />} color="orange" loading={loading} subtext="Dialing or talking" />
        <StatCard title="Talk time" value={v(formatDuration(s?.total_call_seconds))} icon={<Clock />} color="violet" loading={loading} subtext={s ? `${s.total_call_minutes} min total` : undefined} />
        <StatCard title="Plivo billing" value={c(formatMoney(plivoBilling, 2))} icon={<Receipt />} color="amber" loading={loading || callsLoading} subtext="Billed by Plivo" />
        <StatCard title="AI cost" value={c(formatMoney(aiCost, 2))} icon={<IndianRupee />} color="teal" loading={loading || callsLoading} subtext="STT, LLM, TTS and tax" />
        <StatCard title="Total campaign cost" value={c(totalCampaignCost === undefined ? "-" : formatMoney(totalCampaignCost, 2))} icon={<IndianRupee />} color="sky" loading={loading || callsLoading} subtext="AI cost + Plivo billing" />
        <div className="col-span-2 min-w-0 md:col-span-1">
          <StatCard title="Running for" value={v(formatDuration(s?.total_run_seconds))} icon={<Timer />} color="indigo" loading={loading} subtext="Since the campaign started" />
        </div>
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
  callRecords,
  pools,
  poolIds,
  loading,
  error,
  onRetry,
}: {
  campaignId: string;
  calls: CampaignCallSummary[] | undefined;
  callRecords: CampaignCallsResponse["calls"] | undefined;
  pools: PlivoPool[] | undefined;
  poolIds: string[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [callerNumberFilter, setCallerNumberFilter] = useState("all");
  const [poolFilter, setPoolFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [selectedCallback, setSelectedCallback] = useState<CampaignCallbacksResponse["callbacks"][number] | null>(null);
  const callbacksQuery = useCampaignCallbacks(campaignId, filter === "callbacks");
  const list = useMemo(() => calls ?? [], [calls]);
  const callbackItems = (callbacksQuery.data?.callbacks ?? []).filter((callback) =>
    !search.trim() || `${callback.lead_name ?? ""} ${callback.phone}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const router = useRouter();
const pathname = usePathname();
const searchParams = useSearchParams();
const openId = searchParams.get("call"); // popup is open when this is set
const [selectedCallId, setSelectedCallId] = useState<string | null>(null); // "Last opened" highlight

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

const showCallbackCall = (callback: CampaignCallbacksResponse["callbacks"][number]) => {
  const callId = callbackCallId(callback);
  if (callId) {
    setSelectedCallback(null);
    setSelectedCallId(callId);
    openCall(callId);
    return;
  }
  setSelectedCallback(callback);
};

const callbackCallId = (callback: CampaignCallbacksResponse["callbacks"][number]) =>
  callRecords?.find((record) => record.id === callback.call_id)?.id ?? callback.call_id;

const callbackCallOf = (callback: CampaignCallbacksResponse["callbacks"][number]) => {
  const callId = callbackCallId(callback);
  return callId ? list.find((call) => call.call_id === callId) ?? null : null;
};

const sortedCallbackItems = sort
  ? [...callbackItems].sort((a, b) => {
      const value = (callback: CampaignCallbacksResponse["callbacks"][number]) => {
        const call = callbackCallOf(callback);
        if (!call) return 0;
        switch (sort.key) {
          case "talk": return call.total_talk_seconds;
          case "plivo": return call.plivo_cost;
          case "ai": return call.sarvam_cost;
          case "total": return call.plivo_cost + call.sarvam_cost;
        }
      };
      const difference = value(a) - value(b);
      return sort.dir === "asc" ? difference : -difference;
    })
  : callbackItems;
const callbackPageCount = Math.max(1, Math.ceil(sortedCallbackItems.length / pageSize));
const callbackPage = Math.min(page, callbackPageCount);
const callbackPageItems = sortedCallbackItems.slice((callbackPage - 1) * pageSize, callbackPage * pageSize);

  const callRecordsByPhone = useMemo(() => {
    const records = new Map<string, string>();
    for (const record of callRecords ?? []) {
      const number = record.caller_number?.trim();
      const phone = record.phone_e164?.replace(/\D/g, "");
      if (number && phone) records.set(phone, number);
    }
    return records;
  }, [callRecords]);
  const initiationTimesByPhone = useMemo(() => {
    const records = new Map<string, string>();
    for (const record of callRecords ?? []) {
      const phone = record.phone_e164?.replace(/\D/g, "");
      const initiationTime = [...(record.attempt_history ?? [])]
        .sort((a, b) => b.attempt_no - a.attempt_no)
        .map((attempt) => attempt.cdr?.initiation_time)
        .find((value): value is string => typeof value === "string" && value.length > 0);
      if (phone && initiationTime) records.set(phone, initiationTime);
    }
    return records;
  }, [callRecords]);
  const callerNumberOf = (call: CampaignCallSummary) => {
    const reportNumber = call.caller_number ??
      [...(call.attempts ?? [])].reverse().find((attempt) => attempt.caller_number)?.caller_number;
    return reportNumber ?? callRecordsByPhone.get(call.phone.replace(/\D/g, "")) ?? null;
  };
  const initiationTimeOf = (call: CampaignCallSummary) =>
    initiationTimesByPhone.get(call.phone.replace(/\D/g, "")) ?? null;
  const statuses = [...new Set(list.map((c) => c.status))].sort();
  const callRecordsById = useMemo(
    () => new Map((callRecords ?? []).map((record) => [record.id, record])),
    [callRecords],
  );
  const transferInfo = (call: CampaignCallSummary) => {
    const record = callRecordsById.get(call.call_id);
    const latestAttempt = [...(record?.attempt_history ?? [])]
      .sort((a, b) => b.attempt_no - a.attempt_no)
      .find((attempt) => attempt.transfer_status || attempt.transfer_reason);
    const status = call.transfer_status ?? record?.transfer_status ?? latestAttempt?.transfer_status ?? null;
    const reason = call.transfer_reason ?? record?.transfer_reason ?? latestAttempt?.transfer_reason ?? null;
    const transferred = call.transferred ?? record?.transferred ??
      (call.tag?.toLowerCase() === "call transfer" || record?.tag?.toLowerCase() === "call transfer" || Boolean(status));
    const label = transferred ? "Call Transfer" : call.tag ?? record?.tag ?? (status ? humanize(status) : "-");
    return { status, reason, transferred, label };
  };
  const plivoNumbers = [...new Set(
    [...list.map(callerNumberOf), ...(callRecords ?? []).map((record) => record.caller_number)]
      .filter((number): number is string => Boolean(number?.trim()))
      .map((number) => number.trim()),
  )].sort();
  const assignedPoolIds = new Set(poolIds);
  const poolOptions = (pools ?? []).filter((pool) => assignedPoolIds.has(pool.id)).map((pool) => ({
    id: pool.id,
    name: pool.name,
    numbers: new Set(pool.phone_numbers.map((number) => number.replace(/\D/g, ""))),
  }));
  const selectedPool = poolOptions.find((pool) => pool.id === poolFilter);
  const statusFilter = filter.startsWith("status:") ? filter.slice("status:".length) : null;
  const term = search.trim().toLowerCase();
  const filtered = list.filter(
    (c) =>
      (!statusFilter || c.status === statusFilter) &&
      (filter !== "transfer:yes" || transferInfo(c).transferred) &&
      (filter !== "messages:sent" || c.has_whatsapp_messages) &&
      (!selectedPool || selectedPool.numbers.has((callerNumberOf(c) ?? "").replace(/\D/g, ""))) &&
      (callerNumberFilter === "all" || callerNumberOf(c) === callerNumberFilter) &&
      (!term || `${c.lead_name ?? ""} ${c.phone}`.toLowerCase().includes(term)),
  );
  const filteredRowCount = filtered.length;
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
  const pageCount = Math.max(1, Math.ceil(sortedCalls.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagination = {
    page: currentPage,
    pageCount,
    pageSize,
    total: sortedCalls.length,
    start: (currentPage - 1) * pageSize,
    pageItems: sortedCalls.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    setPage,
  };
  const toggleSort = (key: SortKey) => {
    pagination.setPage(1);
    setSort((current) =>
      current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null,
    );
  };
  const head = [
    ...CALL_HEAD.slice(0, 3),
    CALL_HEAD[3],
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
  const callbackHead = [
    "Lead",
    "Phone",
    "Callback at",
    "Caller number",
    "Status",
    ...(["talk", "plivo", "ai", "total"] as const).map((key) => {
      const label = key === "talk" ? "Talk time" : key === "plivo" ? "Plivo cost" : key === "ai" ? "AI cost" : "Total cost";
      return (
        <SortHead
          key={key}
          label={label}
          active={sort?.key === key}
          dir={sort?.key === key ? sort.dir : null}
          ariaSort={sort?.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
          onClick={() => toggleSort(key)}
        />
      );
    }),
  ];
  const mobileCallItems = pagination.pageItems.map((call) => {
    const totalCost = call.plivo_cost + call.sarvam_cost;
    const avatarSource = call.lead_name?.trim() || call.phone;
    return {
      id: call.call_id,
      avatar: avatarSource.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
      title: call.lead_name || "Unnamed lead",
      subtitle: call.phone,
      badge: <StatusBadge status={call.status} />,
      keyValue: { label: "Total cost", value: <span className="tnum">₹{formatMoney(totalCost, 2)}</span> },
      details: [
        { label: "Transfer", value: transferInfo(call).label },
        ...(transferInfo(call).status ? [{ label: "Transfer status", value: humanize(transferInfo(call).status!) }] : []),
        ...(transferInfo(call).reason ? [{ label: "Transfer reason", value: transferInfo(call).reason! }] : []),
        { label: "Initiation time", value: formatInitiationTime(initiationTimeOf(call)) },
        { label: "Talk time", value: formatDuration(call.total_talk_seconds) },
        { label: "Plivo cost", value: <span className="tnum">₹{formatMoney(call.plivo_cost, 2)}</span> },
        { label: "AI cost", value: <span className="tnum">₹{formatMoney(call.sarvam_cost, 2)}</span> },
        { label: "Total cost", value: <span className="tnum">₹{formatMoney(totalCost, 2)}</span>, fullWidth: true },
      ],
      actions: [{
        label: "View call",
        onClick: () => {
          setSelectedCallId(call.call_id);
          openCall(call.call_id);
        },
      }],
    };
  });
  return (
    <>
      <Card
        flush
        className="blue-fields"
        allowOverflow
        actionsClassName="w-full"
        title="Calls"
        description={filter === "callbacks"
          ? `${callbacksQuery.data?.total_callbacks ?? 0} leads asked for a manual callback. These numbers are not auto-redialled.`
          : `One row per lead. ${filteredRowCount} rows shown (${list.length} total calls). Open a call to see every attempt, its recording and the transcript.`}
        actions={
          list.length > 0 && (
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 md:flex md:w-auto md:flex-wrap md:items-center">
              <SearchInput value={search} onChange={(value) => { setSearch(value); pagination.setPage(1); }} placeholder="Search name or phone" className="w-full md:w-60 [&>input]:min-h-[44px] md:[&>input]:min-h-10" />
              <SelectMenu
                label="Filter campaign calls"
                value={filter}
                onChange={(value) => { setFilter(value); pagination.setPage(1); }}
                options={[
                  { value: "all", label: "All calls" },
                  ...statuses.map((status) => ({ value: `status:${status}`, label: `${humanize(status)} calls` })),
                  { value: "transfer:yes", label: "Call Transfer" },
                  { value: "messages:sent", label: "Messages sent" },
                  { value: "callbacks", label: "Callbacks" },
                ]}
                className="w-full md:hidden"
                showNativeSelect={false}
              />
              <Select
                aria-label="Filter campaign calls"
                value={filter}
                onChange={(e) => { setFilter(e.target.value); pagination.setPage(1); }}
                className="hidden w-full sm:w-48 md:block"
              >
                <option value="all">All calls</option>
                {statuses.map((s) => (
                  <option key={s} value={`status:${s}`}>
                    {humanize(s)} calls
                  </option>
                ))}
                <option value="transfer:yes">Call Transfer</option>
                <option value="messages:sent">Messages sent</option>
                <option value="callbacks">Callbacks</option>
              </Select>
              {poolOptions.length > 0 && <>
                <SelectMenu
                  label="Filter calls by Plivo pool"
                  value={poolFilter}
                  onChange={(value) => { setPoolFilter(value); pagination.setPage(1); }}
                  options={[{ value: "all", label: "All Number Pools" }, ...poolOptions.map((pool) => ({ value: pool.id, label: pool.name }))]}
                  className="w-full md:hidden"
                  showNativeSelect={false}
                />
                <Select
                  aria-label="Filter calls by Plivo pool"
                  value={poolFilter}
                  onChange={(e) => { setPoolFilter(e.target.value); pagination.setPage(1); }}
                  className="hidden w-full sm:w-48 md:block"
                >
                  <option value="all">All Number Pools</option>
                  {poolOptions.map((pool) => (
                    <option key={pool.id} value={pool.id}>{pool.name}</option>
                  ))}
                </Select>
              </>}
              {plivoNumbers.length > 0 && <>
                <SelectMenu
                  label="Filter calls by Plivo number"
                  value={callerNumberFilter}
                  onChange={(value) => { setCallerNumberFilter(value); pagination.setPage(1); }}
                  options={[{ value: "all", label: "All Plivo numbers" }, ...plivoNumbers.map((number) => ({ value: number, label: number }))]}
                  className="w-full md:hidden"
                  showNativeSelect={false}
                />
                <Select
                  aria-label="Filter calls by Plivo number"
                  value={callerNumberFilter}
                  onChange={(e) => { setCallerNumberFilter(e.target.value); pagination.setPage(1); }}
                  className="hidden w-full sm:w-52 md:block"
                >
                  <option value="all">All Plivo numbers</option>
                  {plivoNumbers.map((number) => (
                    <option key={number} value={number}>{number}</option>
                  ))}
                </Select>
              </>}
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:hidden">
                <SelectMenu
                  label="Sort calls by"
                  value={sort?.key ?? "none"}
                  onChange={(value) => {
                    setSort(value === "none" ? null : { key: value as SortKey, dir: sort?.dir ?? "asc" });
                    pagination.setPage(1);
                  }}
                  options={[
                    { value: "none", label: "Normal" },
                    { value: "talk", label: "Talk time" },
                    { value: "plivo", label: "Plivo cost" },
                    { value: "ai", label: "AI cost" },
                    { value: "total", label: "Total cost" },
                  ]}
                  className="w-full"
                  showNativeSelect={false}
                />
                <button
                  type="button"
                  aria-label={`Sort ${sort?.dir === "desc" ? "ascending" : "descending"}`}
                  onClick={() => {
                    setSort((current) => current ? { ...current, dir: current.dir === "asc" ? "desc" : "asc" } : { key: "total", dir: "asc" });
                    pagination.setPage(1);
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md border border-hairline-strong bg-surface-input px-3 text-sm font-medium text-heading hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {sort?.dir === "desc" ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                  {sort?.dir === "desc" ? "Desc" : "Asc"}
                </button>
              </div>
              <span className="ml-auto whitespace-nowrap text-right text-base font-semibold text-blue-600" aria-live="polite">
                {filter === "callbacks" ? callbackItems.length : filteredRowCount} {((filter === "callbacks" ? callbackItems.length : filteredRowCount) === 1) ? "row" : "rows"}
              </span>
            </div>
          )
        }
      >
        {error ? (
          <div className="p-5">
            <ErrorState message={error} onRetry={onRetry} />
          </div>
        ) : filter === "callbacks" && callbacksQuery.isError ? (
          <div className="p-5"><ErrorState message={(callbacksQuery.error as Error).message} onRetry={() => callbacksQuery.refetch()} /></div>
        ) : filter === "callbacks" && callbacksQuery.isLoading ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Loading callbacks…</p>
        ) : filter === "callbacks" && callbackItems.length === 0 ? (
          <EmptyState title="No callbacks requested" text="Leads who ask for a manual follow-up will appear here." />
        ) : filter !== "callbacks" && !loading && list.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<CalendarClock size={20} />}
              title="No calls yet"
              text="Calls are created from the uploaded leads sheet when the campaign is scheduled."
            />
          </div>
        ) : (
          <div className="space-y-3">
            <Table
              bare
              className="blue-table"
              head={filter === "callbacks" ? callbackHead : head}
              columns={filter === "callbacks" ? [
                { label: "Lead", width: "16%" }, { label: "Phone", width: "12%" }, { label: "Callback at", width: "17%" },
                { label: "Caller number", width: "14%" }, { label: "Status", width: "10%" }, { label: "Talk time", width: "8%" },
                { label: "Plivo cost", width: "8%" }, { label: "AI cost", width: "7%" }, { label: "Total cost", width: "8%" },
              ] : CALL_COLUMNS}
              label={filter === "callbacks" ? "Campaign callbacks" : "Campaign calls"}
              loading={filter === "callbacks" ? false : loading}
              skeleton={<TableSkeleton columns={CALL_COLUMNS} rows={6} />}
              mobileItems={filter === "callbacks" ? callbackPageItems.map((callback, index) => {
                const call = callbackCallOf(callback);
                return {
                  id: `${callback.phone}-${callback.callback_at ?? index}`,
                  avatar: (callback.lead_name || callback.phone).split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
                  title: callback.lead_name || "Unnamed lead",
                  subtitle: callback.phone,
                  badge: callback.last_outcome ? <StatusBadge status={callback.last_outcome} /> : undefined,
                  keyValue: { label: "Callback at", value: formatCallbackAtIST(callback.callback_at) },
                  details: [
                    { label: "Caller number", value: callback.caller_number || "-" },
                    { label: "Talk time", value: call ? formatDuration(call.total_talk_seconds) : "-" },
                    { label: "Plivo cost", value: call ? `₹${formatMoney(call.plivo_cost, 2)}` : "-" },
                    { label: "AI cost", value: call ? `₹${formatMoney(call.sarvam_cost, 2)}` : "-" },
                    { label: "Total cost", value: call ? `₹${formatMoney(call.plivo_cost + call.sarvam_cost, 2)}` : "-" },
                  ],
                  actions: [{ label: "View details", onClick: () => showCallbackCall(callback) }],
                };
              }) : mobileCallItems}
            >
              {filter === "callbacks" ? callbackPageItems.map((callback, index) => {
                const call = callbackCallOf(callback);
                return (
                  <tr
                    key={`${callback.phone}-${callback.callback_at ?? index}`}
                    tabIndex={0}
                    aria-label={`View call details for ${callback.lead_name || callback.phone}`}
                    onClick={() => showCallbackCall(callback)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        showCallbackCall(callback);
                      }
                    }}
                    className="cursor-pointer outline-none hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_3px_0_0_var(--primary)]"
                  >
                    <td className="px-4 py-3 font-medium text-heading">{callback.lead_name || "Unnamed lead"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-body">{callback.phone}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-body">{formatCallbackAtIST(callback.callback_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-body">{callback.caller_number || "-"}</td>
                    <td className="px-4 py-3">{callback.last_outcome ? <StatusBadge status={callback.last_outcome} /> : <span className="text-muted">-</span>}</td>
                    <td className="tnum whitespace-nowrap px-4 py-3 text-body">{call ? formatDuration(call.total_talk_seconds) : "-"}</td>
                    <td className="tnum whitespace-nowrap px-4 py-3 text-body">{call ? `₹${formatMoney(call.plivo_cost, 2)}` : "-"}</td>
                    <td className="tnum whitespace-nowrap px-4 py-3 text-body">{call ? `₹${formatMoney(call.sarvam_cost, 2)}` : "-"}</td>
                    <td className="tnum whitespace-nowrap px-4 py-3 font-semibold text-heading">{call ? `₹${formatMoney(call.plivo_cost + call.sarvam_cost, 2)}` : "-"}</td>
                  </tr>
                );
              }) : filtered.length === 0 ? (
                <TableMessage cols={CALL_HEAD.length}>No calls match your filters.</TableMessage>
              ) : pagination.pageItems.map((call) => (
                <CallRow
                  key={call.call_id}
                  call={call}
                  transfer={transferInfo(call)}
                  initiationTime={initiationTimeOf(call)}
                  selected={call.call_id === selectedCallId}
                  onOpen={() => {
                    setSelectedCallId(call.call_id);
                    openCall(call.call_id);
                  }}
                />
              ))}
            </Table>
            {filter === "callbacks" ? (
              <div className="flex flex-col gap-2 px-1 pt-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-blue-600 dark:text-blue-400" aria-live="polite">
                  Showing {(callbackPage - 1) * pageSize + 1}-{Math.min(callbackPage * pageSize, callbackItems.length)} of {callbackItems.length} callbacks
                </p>
                {callbackItems.length > pageSize && (
                  <nav aria-label="Callbacks pagination" className="flex items-center gap-2 md:flex-none">
                    <button type="button" disabled={callbackPage <= 1} onClick={() => setPage(callbackPage - 1)} className="btn-blue-filled inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[36px] md:min-w-[96px] md:flex-none">Previous</button>
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400" aria-live="polite">Page {callbackPage} of {callbackPageCount}</span>
                    <button type="button" disabled={callbackPage >= callbackPageCount} onClick={() => setPage(callbackPage + 1)} className="btn-blue-filled inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[36px] md:min-w-[96px] md:flex-none">Next</button>
                  </nav>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-1 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-blue-600 dark:text-blue-400" aria-live="polite">
                  Showing {pagination.total === 0 ? 0 : pagination.start + 1}-{Math.min(pagination.start + pagination.pageSize, pagination.total)} of {pagination.total} calls
                </p>
                {pagination.total > pagination.pageSize && (
                  <nav aria-label="Calls pagination" className="flex items-center gap-2 md:flex-none">
                    <button type="button" disabled={pagination.page <= 1} onClick={() => pagination.setPage(pagination.page - 1)} className="btn-blue-filled inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[36px] md:min-w-[96px] md:flex-none">Previous</button>
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400" aria-live="polite">Page {pagination.page} of {pagination.pageCount}</span>
                    <button type="button" disabled={pagination.page >= pagination.pageCount} onClick={() => pagination.setPage(pagination.page + 1)} className="btn-blue-filled inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[36px] md:min-w-[96px] md:flex-none">Next</button>
                  </nav>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {selectedCallback && (
        <Drawer title={selectedCallback.lead_name || "Callback details"} onClose={() => setSelectedCallback(null)}>
          <DetailList items={[
            { label: "Lead name", value: selectedCallback.lead_name || "-" },
            { label: "Phone", value: selectedCallback.phone },
            { label: "Callback at", value: formatCallbackAtIST(selectedCallback.callback_at) },
            { label: "Caller number", value: selectedCallback.caller_number || "-" },
            { label: "Status", value: selectedCallback.status || "-" },
            { label: "Last outcome", value: selectedCallback.last_outcome || "-" },
          ]} />
        </Drawer>
      )}
      {openId && <CallDrawer campaignId={campaignId} callId={openId} onClose={closeCall} />}
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
      aria-label={`Sort by ${label}: ${!active ? "normal" : dir === "asc" ? "low to high" : "high to low"}`}
      onClick={onClick}
      className={clsx(
        "inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active ? "text-heading" : "text-muted hover:text-heading",
      )}
    >
      <span>{label}</span>
      <SortIcon size={16} aria-hidden className="text-blue-600 dark:text-blue-400" />
    </button>
  );
}

function CallRow({
  call,
  transfer,
  initiationTime,
  selected,
  onOpen,
}: {
  call: CampaignCallSummary;
  transfer: { status: string | null; reason: string | null; transferred: boolean; label: string };
  initiationTime: string | null;
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
          ? "bg-[var(--primary-tint)] shadow-[inset_3px_0_0_var(--primary-marker)] "
          : "hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:shadow-[inset_3px_0_0_var(--primary)] "
      }`}
    >
      <td className="px-4 py-3 font-medium text-heading">
        {call.lead_name || <span className="text-faint">Unnamed</span>}
        {selected && (
          <span className="ml-2 inline-flex rounded-full bg-[var(--primary-tint)] px-2 py-0.5 text-[10px] font-medium text-link">
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
      <td className="px-4 py-3 text-body">
        <span>{transfer.label}</span>
        {transfer.status && <span className="mt-0.5 block text-xs text-muted">{humanize(transfer.status)}</span>}
        {transfer.reason && <span className="mt-0.5 block max-w-56 truncate text-xs text-muted" title={transfer.reason}>{transfer.reason}</span>}
      </td>
      <td className="tnum whitespace-nowrap px-4 py-3 text-body">
        {formatInitiationTime(initiationTime)}
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
  callId,
  onClose,
}: {
  campaignId: string;
  callId: string;
  onClose: () => void;
}) {
  const details = useCampaignCallDetail(campaignId, callId);
  const postOutcome = usePostCampaignCallOutcome();
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const callDetail = details.data?.call;
  const live = callDetail ? ACTIVE.has(callDetail.status.toLowerCase()) : false;
  const attempts = [...(details.data?.attempts ?? [])].sort((a, b) => b.attempt_no - a.attempt_no);

  const save = () => {
    if (!outcome) return;
    postOutcome.mutate(
      { campaignId, callId, outcome },
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
      <SkeletonBoundary loading={details.isLoading} skeleton={<CallDetailsSkeleton />}>
      {details.isError ? (
        <ErrorState message={details.error.message} onRetry={() => details.refetch()} />
      ) : callDetail ? (
        <>
          <DetailList
            columns={3}
            items={[
              { label: "Attempts", value: <span className="tnum">{callDetail.attempt_count} of {callDetail.max_attempts}</span> },
              { label: "Scheduled_At", value: formatDateWithSeconds(callDetail.scheduled_at) },
              { label: "Called from", value: <span className="tnum">{callDetail.caller_number ?? "-"}</span> },
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
                <Button className="btn-blue-filled" onClick={save} disabled={!outcome} loading={postOutcome.isPending}>
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
      </SkeletonBoundary>
    </Drawer>
  );
}

function formatHangupCause(attempt: CampaignCallDetailAttempt): string {
  const cause = displayAttemptText(attempt.plivo.hangup_cause_name);
  if (cause === "Not available") return cause;

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
  mobileTwoColumns = false,
}: {
  attempt: CampaignCallDetailAttempt;
  showDuration?: boolean;
  showRecordingUrl?: boolean;
  mobileTwoColumns?: boolean;
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
                  mobileTwoColumns={mobileTwoColumns}
                  items={[
                    { label: "Message", value: message.message_name || "WhatsApp message", wide: (message.message_name?.length ?? 0) > 24 },
                    { label: "Status", value: message.status ? <StatusBadge status={message.status} /> : "Not available" },
                    { label: "Delivered at", value: formatDateWithSeconds(message.delivered_at), wide: formatDateWithSeconds(message.delivered_at).length > 22 },
                    { label: "Read at", value: formatDateWithSeconds(message.read_at), wide: formatDateWithSeconds(message.read_at).length > 22 },
                  ]}
                />
              </article>
            ))
          )}
        </section>

        <DetailList
          columns={3}
          mobileTwoColumns={mobileTwoColumns}
          items={[
            { label: "Plivo cost", value: <span className="tnum">₹{formatMoney(plivoCost, 2)}</span> },
            { label: "AI cost", value: <span className="tnum">₹{formatMoney(aiCost, 2)}</span> },
            { label: "Total cost (Plivo + AI)", value: <span className="tnum font-semibold">₹{formatMoney(combinedCost, 2)}</span> },
          ]}
        />
        <DetailList
          columns={3}
          mobileTwoColumns={mobileTwoColumns}
          items={[
            { label: "Caller number", value: <span className="tnum">{displayAttemptText(a.caller_number)}</span>, wide: (a.caller_number?.length ?? 0) > 18 },
            ...(showDuration ? [{ label: "Duration", value: <span className="tnum">{a.duration_seconds ? formatDuration(a.duration_seconds) : "Not available"}</span> }] : []),
            { label: "Submitted", value: formatDateWithSeconds(a.submitted_at), wide: formatDateWithSeconds(a.submitted_at).length > 22 },
            { label: "Ended", value: formatDateWithSeconds(a.ended_at), wide: formatDateWithSeconds(a.ended_at).length > 22 },
            { label: "Hang-up", value: hangupCause, wide: hangupCause.length > 22 },
            { label: "Transfer", value: a.transfer_status ? `${humanize(a.transfer_status)}${a.transfer_reason ? ` - ${a.transfer_reason}` : ""}` : "None", wide: `${a.transfer_status ?? ""}${a.transfer_reason ?? ""}`.length > 22 },
            { label: "Transfer reason", value: displayAttemptText(a.transfer_reason), wide: (a.transfer_reason?.length ?? 0) > 22 },
            { label: "Plivo status", value: a.plivo.status ? humanize(displayAttemptText(a.plivo.status)) : "Not available" },
            { label: "Machine detected", value: a.plivo.machine_detected == null ? "Not available" : String(a.plivo.machine_detected) },
          ]}
        />

        <section className="space-y-2">
          <h4 className="eyebrow">Recording</h4>
          {a.recording_url ? (
            <>
              {showRecordingUrl && <RecordingUrl value={a.recording_url} />}
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
                className="text-sm font-medium text-link underline-offset-2 hover:underline"
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
                            agent ? "bg-surface text-body" : "bg-[var(--primary-tint)] text-link",
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

function RecordingUrl({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-start gap-1">
      <a href={value} target="_blank" rel="noreferrer" className="break-all text-xs text-black underline-offset-2 hover:underline">{value}</a>
      <span className="relative inline-flex shrink-0">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            } catch {
              setCopied(false);
            }
          }}
          aria-label="Copy recording URL"
          className="rounded-full border border-blue-200 bg-blue-50 p-1.5 text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-100 hover:text-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
        >
          <Copy size={15} aria-hidden />
        </button>
        {copied && (
          <span role="status" className="absolute bottom-full right-0 mb-1 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow">
            Copied
          </span>
        )}
      </span>
    </div>
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
      <Card flush title="Who and from where" className="h-full lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <InfoTile
            title="Calling agent"
            icon={<Bot />}
            color="blue"
            items={[{ key: campaign.agent_id, name: agentName ?? "Unknown agent", href: `/calling-agent/agents/${campaign.agent_id}` }]}
          />
          <InfoTile
            title="Call transfer agents"
            icon={<PhoneForwarded />}
            color="purple"
            items={campaign.representative_ids.map((id) => ({
              key: id,
              name: nameOf(representatives.data, id),
              href: "/?tab=calling-agent&callingTab=representatives",
            }))}
          />
          <div className="md:col-span-2">
            <PlivoPoolsInfoTile campaign={campaign} availablePools={plivoPools.data} />
          </div>
        </div>
      </Card>

      <Card title="Timing & limits">
        <DetailList
          columns={2}
          mobileTwoColumns
          items={[
            {
              label: "Start",
              value: campaign.start_at
                ? new Date(campaign.start_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })
                : "-",
              wide: true,
            },
            { label: "Calling hours", value: <span className="tnum">{formatWindow(campaign.window_start, campaign.window_end)}</span> },
            { label: "Call days", value: formatDays(campaign.call_days), wide: formatDays(campaign.call_days).length > 22 },
            { label: "Timezone", value: campaign.timezone, wide: campaign.timezone.length > 22 },
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

const INFO_TILE_COLORS = {
  blue: {
    iconBox: "bg-blue-100 text-blue-700 dark:bg-primary-soft dark:text-primary-soft-text",
    avatar: "bg-blue-100 text-blue-700 dark:bg-primary-soft dark:text-primary-soft-text",
  },
  purple: {
    iconBox: "bg-purple-100 text-purple-700 dark:bg-primary-soft dark:text-primary-soft-text",
    avatar: "bg-purple-100 text-purple-700 dark:bg-primary-soft dark:text-primary-soft-text",
  },
  amber: {
    iconBox: "bg-amber-100 text-amber-700 dark:bg-primary-soft dark:text-primary-soft-text",
    avatar: "bg-amber-100 text-amber-700 dark:bg-primary-soft dark:text-primary-soft-text",
  },
} as const;

function PlivoPoolsInfoTile({
  campaign,
  availablePools,
}: {
  campaign: Campaign;
  availablePools: PlivoPool[] | undefined;
}) {
  const poolIds = [...new Set([
    ...campaign.plivo_pool_ids,
    ...(campaign.pools ?? []).map((pool) => pool.pool_id),
  ])];
  const pools = poolIds.map((id) => {
    const campaignPool = campaign.pools?.find((pool) => pool.pool_id === id);
    const availablePool = availablePools?.find((pool) => pool.id === id);
    const callsByNumber = new Map<string, number>(
      (campaignPool?.numbers ?? []).map((number) => [number.phone_e164, number.calls] as const),
    );
    const poolPhoneNumbers = [...new Set([
      ...(availablePool?.phone_numbers ?? []),
      ...(campaignPool?.numbers.map((number) => number.phone_e164) ?? []),
    ])];
    const mergedNumbers = poolPhoneNumbers.map((phone) => ({
      phone,
      calls: callsByNumber.get(phone) ?? (campaignPool ? 0 : undefined),
    }));
    return {
      id,
      name: campaignPool?.pool_name ?? availablePool?.name ?? `${id.slice(0, 8)}…`,
      numbers: mergedNumbers,
    };
  });
  const poolNumbers = new Set(pools.flatMap((pool) => pool.numbers.map((number) => number.phone)));
  const directNumbers = campaign.direct_numbers ?? [];
  const directNumberSet = new Set(directNumbers.map((number) => number.phone_e164));
  const otherConfiguredNumbers = campaign.plivo_numbers.filter(
    (number) => !poolNumbers.has(number) && !directNumberSet.has(number),
  );

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-hairline bg-raised/30 p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${INFO_TILE_COLORS.amber.iconBox}`} aria-hidden="true">
          <Phone />
        </span>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Plivo pools</h3>
      </div>

      {pools.length > 0 ? (
        <div className="space-y-2">
          {pools.map((pool) => (
            <details key={pool.id} className="group min-w-0 overflow-hidden rounded-lg border border-hairline bg-surface">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link [&::-webkit-details-marker]:hidden">
                <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">{pool.name}</span>
                <span className="shrink-0 text-xs text-muted">{pool.numbers.length} {pool.numbers.length === 1 ? "number" : "numbers"}</span>
              </summary>
              <div className="border-t border-hairline px-3 py-2.5">
                {pool.numbers.length > 0 ? (
                  <PoolNumbersList poolId={pool.id} numbers={pool.numbers} />
                ) : (
                  <p className="text-sm text-muted">No phone numbers in this pool.</p>
                )}
                <Link href={`/number-pool/pools/${pool.id}`} className="mt-3 inline-flex text-xs font-medium text-link underline-offset-2 hover:underline">
                  Open pool
                </Link>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-hairline-strong px-3 py-2 text-sm text-muted">None assigned</div>
      )}

      {(directNumbers.length > 0 || otherConfiguredNumbers.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted">Other configured numbers</h4>
          <div className="flex flex-wrap gap-2">
            {directNumbers.map((number) => (
              <span key={`direct:${number.phone_e164}`} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-heading">
                <span className="break-all">{number.phone_e164}</span>
                <span className="shrink-0 text-xs text-muted">{number.calls} {number.calls === 1 ? "call" : "calls"}</span>
              </span>
            ))}
            {otherConfiguredNumbers.map((number) => (
              <span key={`configured:${number}`} className="max-w-full break-all rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-heading">{number}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PoolNumbersList({
  poolId,
  numbers,
}: {
  poolId: string;
  numbers: Array<{ phone: string; calls: number | undefined }>;
}) {
  const [visibleCount, setVisibleCount] = useState(30);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollAreaRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || visibleCount >= numbers.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + 30, numbers.length));
        }
      },
      { root, rootMargin: "80px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [numbers.length, visibleCount]);

  return (
    <div
      ref={scrollAreaRef}
      className="max-h-64 overflow-y-auto overscroll-contain pr-2"
      aria-label={`Numbers in pool ${poolId}`}
    >
      <ul className="divide-y divide-hairline">
        {numbers.slice(0, visibleCount).map((number) => (
          <li key={`${poolId}:${number.phone}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0">
            <span className="break-all text-sm text-heading">{number.phone}</span>
            <span className="shrink-0 text-xs text-muted">
              {number.calls === undefined ? "Call count unavailable" : `${number.calls} ${number.calls === 1 ? "call" : "calls"}`}
            </span>
          </li>
        ))}
      </ul>
      {visibleCount < numbers.length && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}
    </div>
  );
}

type InfoTileColor = keyof typeof INFO_TILE_COLORS;
type InfoTileItem = { key: string; name: string; href?: string };

function InfoTile({
  title,
  icon,
  color,
  items,
  extraItems = [],
  extraLabel,
}: {
  title: string;
  icon: React.ReactNode;
  color: InfoTileColor;
  items: InfoTileItem[];
  extraItems?: InfoTileItem[];
  extraLabel?: string;
}) {
  const colors = INFO_TILE_COLORS[color];
  const renderItems = (values: InfoTileItem[]) => values.map((item) => {
    const content = (
      <>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase ${colors.avatar}`} aria-hidden="true">
          {item.name.charAt(0) || "?"}
        </span>
        <span className="min-w-0 truncate">{item.name}</span>
      </>
    );
    const className = "inline-flex max-w-full items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm font-medium text-heading";
    return item.href ? (
      <Link key={item.key} href={item.href} className={`${className} hover:border-[var(--link-color)] hover:text-link`}>
        {content}
      </Link>
    ) : (
      <span key={item.key} className={className}>{content}</span>
    );
  });

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-hairline bg-raised/30 p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.iconBox}`} aria-hidden="true">
          {icon}
        </span>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      </div>
      {items.length ? (
        <div className="flex flex-wrap gap-2">{renderItems(items)}</div>
      ) : (
        <div className="rounded-lg border border-dashed border-hairline-strong px-3 py-2 text-sm text-muted">None assigned</div>
      )}
      {extraItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted">{extraLabel}</h4>
          <div className="flex flex-wrap gap-2">{renderItems(extraItems)}</div>
        </div>
      )}
    </section>
  );
}
