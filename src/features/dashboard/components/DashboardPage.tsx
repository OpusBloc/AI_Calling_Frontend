"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { ArrowRight, Bot, CheckCircle2, Circle, Clock, IndianRupee, Phone, PhoneCall, PhoneForwarded, Sigma } from "lucide-react";
import type { CostTrendPoint } from "@/components/CostSplit";
import { getCallCostSummary } from "@/lib/api";
import type { CallCostSummary } from "@/types/types";
import CampaignsStatCard from "@/features/dashboard/components/CampaignsStatCard";
import StatCard from "@/features/dashboard/components/StatCard";
import { useAgents, useCampaigns, usePlivoNumbers, usePlivoPools, useRepresentatives } from "@/hooks/hooks";
import { formatWindow } from "@/features/campaigns/components/CampaignsTab";
import {
  Card,
  ErrorState,
  LinkRow,
  StatusBadge,
  Table,
  formatDate,
  formatDuration,
  formatMoney,
} from "@/components/ui";
import { ChartSkeleton, DashboardSkeleton, TableSkeleton, useSkeletonVisibility } from "@/components/skeletons";
import { DASHBOARD_CAMPAIGN_COLUMNS } from "@/components/skeletons/table-columns";


const RECENT_HEAD = DASHBOARD_CAMPAIGN_COLUMNS.map((column) => column.label);
const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 0, label: "All time" },
] as const;
const CostSplit = dynamic(() => import("@/components/CostSplit"), {
  loading: () => (
    <div className="grid min-w-0 grid-cols-1 gap-4 overflow-visible xl:grid-cols-2">
      <ChartSkeleton height="h-72" />
      <ChartSkeleton height="h-72" />
    </div>
  ),
});
function costTrendFromSummary(summary?: CallCostSummary): CostTrendPoint[] {
  const trend = [...(summary?.by_day ?? [])]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((item) => ({
      date: new Date(`${item.day}T00:00:00Z`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      cost: item.grand_total?.INR ?? item.sarvam_cost + item.plivo_cost_inr,
    }));

  // The API's daily totals and period grand total can differ by a paise due to
  // rounding each independently. Keep the cumulative trend endpoint aligned
  // with the authoritative total shown in the donut.
  const total = summary?.grand_total?.INR;
  if (total !== undefined && trend.length > 0) {
    const priorTotal = trend.slice(0, -1).reduce((sum, point) => sum + point.cost, 0);
    trend[trend.length - 1].cost = Math.max(0, total - priorTotal);
  }

  return trend;
}

function DashboardPageContent() {
  const campaigns = useCampaigns();
  const agents = useAgents();
  const representatives = useRepresentatives();
  const plivoNumbers = usePlivoNumbers();
  const plivoPools = usePlivoPools();
  const [days, setDays] = useState<number>(30);
  const showRecentSkeleton = useSkeletonVisibility(campaigns.isLoading && !campaigns.data);

  const count = (q: { isLoading: boolean; data?: unknown[] }) => (q.isLoading || !q.data ? "—" : q.data.length);
  const running = campaigns.data?.filter((c) => c.status === "running").length ?? 0;
  const scheduled = campaigns.data?.filter((c) => c.status === "scheduled").length ?? 0;
  const activeReps = representatives.data?.filter((r) => r.active).length ?? 0;
  const recent = [...(campaigns.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);

  const steps = [
    { done: !!agents.data?.length, label: "Create a calling agent", href: "/calling-agent/agents/new" },
    { done: !!plivoPools.data?.length, label: "Group Plivo numbers into a Plivo pool", href: "/number-pool" },
    { done: activeReps > 0, label: "Add a transfer agent to take interested leads", href: "/?tab=calling-agent&callingTab=representatives" },
    { done: !!campaigns.data?.length, label: "Create a campaign and upload its leads sheet", href: "/campaigns/new" },
  ];
  const loaded = [agents, plivoPools, representatives, campaigns].every((q) => q.isSuccess);
  const setupDone = steps.every((s) => s.done);

  return (
    <div className="space-y-8">
      
      <div className="w-full overflow-visible mt-5">
        <h2 id="analytics-heading" className="mb-5 text-lg font-semibold text-heading">
        Analytics
      </h2>
        <div className="grid w-full grid-cols-1 gap-6 overflow-visible sm:grid-cols-2 lg:grid-cols-4">
          <CampaignsStatCard running={running} scheduled={scheduled} total={campaigns.data?.length} loading={campaigns.isLoading} />
          <StatCard
            title="Agents"
            icon={<Bot size={22} />}
            tone="blue"
            value={count(agents)}
            label="agents"
            loading={agents.isLoading}
            href="/?tab=calling-agent&callingTab=agents"
          />
          <StatCard
            title="Transfer agents"
            icon={<PhoneForwarded size={22} />}
            tone="green"
            value={count(representatives)}
            label={`${activeReps} active`}
            loading={representatives.isLoading}
            href="/?tab=calling-agent&callingTab=representatives"
          />
          <StatCard
            title="Caller numbers"
            icon={<Phone size={22} />}
            tone="purple"
            value={count(plivoNumbers)}
            label={`${plivoPools.data?.length ?? 0} pools`}
            loading={plivoNumbers.isLoading || plivoPools.isLoading}
            href="/number-pool"
          />
        </div>
      </div>

      <CostSection days={days} setDays={setDays} />

      <div className={clsx("grid gap-6", loaded && !setupDone && "lg:grid-cols-3")}>
        <Card
          flush
          title="Recent campaigns"
          className={clsx("recent-table", loaded && !setupDone && "lg:col-span-2")}
          actions={
            <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm font-medium text-accent-text underline-offset-2 hover:underline">
              View all <ArrowRight size={14} aria-hidden />
            </Link>
          }
        >
          {campaigns.isError ? (
            <div className="p-5">
              <ErrorState message={(campaigns.error as Error).message} onRetry={() => campaigns.refetch()} />
            </div>
          ) : campaigns.isSuccess && recent.length === 0 && !showRecentSkeleton ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No campaigns yet.{" "}
              <Link href="/campaigns/new" className="font-medium text-accent-text underline underline-offset-2">
                Create one
              </Link>
            </p>
          ) : (
            <Table bare head={RECENT_HEAD} columns={DASHBOARD_CAMPAIGN_COLUMNS} label="Recent campaigns" loading={campaigns.isLoading || showRecentSkeleton} skeleton={<TableSkeleton columns={DASHBOARD_CAMPAIGN_COLUMNS} rows={4} />}>
              {recent.map((c) => (
                  <LinkRow key={c.id} href={`/campaigns/${c.id}`}>
                    <td className="px-4 py-3 font-medium text-heading">{c.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="tnum whitespace-nowrap px-4 py-3 text-body">{formatWindow(c.window_start, c.window_end)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(c.updated_at)}</td>
                  </LinkRow>
              ))}
            </Table>
          )}
        </Card>

        {loaded && !setupDone && (
          <Card title="Get set up" description={`${steps.filter((s) => s.done).length} of ${steps.length} done`}>
            <ol className="space-y-1">
              {steps.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex min-h-10 items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-surface-hover">
                    {s.done ? (
                      <CheckCircle2 size={18} className="shrink-0 text-gain" aria-label="Done" />
                    ) : (
                      <Circle size={18} className="shrink-0 text-faint" aria-label="To do" />
                    )}
                    <span className={s.done ? "text-muted line-through" : "font-medium text-heading"}>{s.label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}

const DashboardPage = dynamic(() => Promise.resolve(DashboardPageContent), {
  loading: () => <DashboardSkeleton />,
});

export default DashboardPage;

/*------------------------------- CostStatCard UI ---------------------------------------*/
const TONES = {
  green:  "bg-emerald-100 text-emerald-900 dark:bg-primary-soft dark:text-primary-soft-text",
  amber:  "bg-amber-100 text-amber-900 dark:bg-primary-soft dark:text-primary-soft-text",
  pink:   "bg-pink-100 text-pink-900 dark:bg-primary-soft dark:text-primary-soft-text",
  purple: "bg-purple-100 text-purple-900 dark:bg-primary-soft dark:text-primary-soft-text",
  blue:   "bg-sky-100 text-sky-900 dark:bg-primary-soft dark:text-primary-soft-text",
} as const;

function CostStatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-1.5">
      <div className={clsx("flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium", TONES[tone])}>
        <span className="shrink-0" aria-hidden>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="px-3 pb-2.5 pt-2">
        <div className="truncate text-2xl font-bold tabular-nums font-numeric text-heading">{value}</div>
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      </div>
    </div>
  );
}


/* --------------------------------- Costs ---------------------------------- */

function CostSection({ days, setDays }: { days: number; setDays: (d: number) => void }) {
  const summary = useQuery({
    queryKey: ["call-costs", "summary", days],
    queryFn: () => getCallCostSummary(days || undefined),
    retry: false,
  });

  const s = summary.data;
  const trend = costTrendFromSummary(s);
  const v = (n: React.ReactNode) => (summary.isLoading || !s ? "—" : n);
  const callDays = days > 0 ? days : s?.by_day?.length || 1; // "All time" uses the number of days with data

  return (
    <section aria-labelledby="cost-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="cost-heading" className="text-lg font-semibold text-heading">
            Call costs
          </h2>
        </div>
<div
  role="radiogroup"
  aria-label="Period"
  className="inline-flex rounded-md border border-[var(--dashboard-toggle-border)] bg-toggle p-0.5"
>
  {PERIODS.map((p) => (
    <button
      key={p.days}
      type="button"
      role="radio"
      aria-checked={days === p.days}
      onClick={() => setDays(p.days)}
      className={clsx(
        "h-8 rounded px-3 text-sm font-medium transition-colors",
        days === p.days
          ? "bg-[var(--dashboard-toggle-active-bg)] text-[var(--dashboard-toggle-active-text)] shadow-sm"
          : "text-[var(--dashboard-toggle-inactive-text)] hover:text-heading",
      )}
    >
      {p.label}
    </button>
  ))}
</div>
      </div>

      {summary.isError ? (
        <ErrorState title="Couldn't load call costs" message={(summary.error as Error).message} onRetry={() => summary.refetch()} />
      ) : (
        <>
          <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 [&>div]:min-w-0 [&>div>a]:relative [&>div>a]:z-0 [&>div>a]:shadow-sm [&>div>a]:transition-transform [&>div>a]:duration-200 [&>div>a:hover]:z-10 motion-safe:[&>div>a:hover]:scale-[1.01] [&>div>a:hover]:shadow-md [&>div>div]:relative [&>div>div]:z-0 [&>div>div]:shadow-sm [&>div>div]:transition-transform [&>div>div]:duration-200 [&>div>div:hover]:z-10 motion-safe:[&>div>div:hover]:scale-[1.01] [&>div>div:hover]:shadow-md motion-reduce:[&>div>a]:transition-none motion-reduce:[&>div>div]:transition-none">
<div className="min-w-0">
  <CostStatCard
    tone="green"
    label="Total AI cost"
    icon={<IndianRupee size={20} />}
    value={v(s?.total_cost === undefined ? "—" : `₹${formatMoney(s.total_cost)}`)}
    hint={s ? `₹${formatMoney(s.average_per_call.total_cost, 2)} per call on average` : undefined}
  />
</div>
<div className="min-w-0">
  <CostStatCard
    tone="amber"
    label="Plivo cost"
    icon={<Phone size={20} />}
    value={v(s?.plivo_cost_inr === undefined ? "—" : `₹${formatMoney(s.plivo_cost_inr)}`)}
    hint={s?.plivo_billed_attempts !== undefined ? `${s.plivo_billed_attempts.toLocaleString()} billed attempts` : undefined}
  />
</div>
<div className="min-w-0">
  <CostStatCard
    tone="pink"
    label="Calls"
    icon={<PhoneCall size={20} />}
    value={v(s?.calls.toLocaleString())}
    hint={s ? `${Math.round(s.calls / callDays).toLocaleString()} calls per day on average` : undefined}
  />
</div>
<div className="min-w-0">
  <CostStatCard
    tone="purple"
    label="Talk time"
    icon={<Clock size={20} />}
    value={v(formatDuration(s?.seconds))}
    hint={s ? `${formatDuration(s.average_per_call.seconds)} per call on average` : undefined}
  />
</div>
<div className="min-w-0">
  <CostStatCard
    tone="blue"
    label="Tokens used"
    icon={<Sigma size={20} />}
    value={v(((s?.prompt_tokens ?? 0) + (s?.completion_tokens ?? 0)).toLocaleString())}
    hint={s ? `${(s.tts_chars ?? 0).toLocaleString()} characters spoken` : undefined}
  />
</div>
          </div>

          <CostSplit
            loading={summary.isLoading}
            summaryData={s}
            totalLabel="Total Campaigns cost"
            trend={trend}
            trendLoading={summary.isLoading}
          />
          <p className="text-xs text-muted">Per-call costs are on each campaign&apos;s Costs tab.</p>
        </>
      )}

    </section>
  );
}
