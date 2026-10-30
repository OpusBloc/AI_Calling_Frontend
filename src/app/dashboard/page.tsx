"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowRight, Bot, CheckCircle2, Circle, Clock, IndianRupee, Megaphone, Phone, PhoneCall, PhoneForwarded, Sigma } from "lucide-react";

import { getCallCostSummary, getCallCosts } from "@/lib/api";
import type { CallCostSummary } from "@/types/types";
import { useAgents, useCampaigns, usePlivoNumbers, usePlivoPools, useRepresentatives } from "@/hooks/hooks";
import PageHeader from "@/components/PageHeader";
import { formatWindow } from "@/components/campaigns/CampaignsTab";
import {
  Card,
  ErrorState,
  LinkRow,
  Skeleton,
  SkeletonRows,
  StatTile,
  StatusBadge,
  Table,
  TableMessage,
  formatDate,
  formatDuration,
  formatMoney,
} from "@/components/ui";

const RECENT_HEAD = ["Campaign", "Status", "Calling hours", "Updated"];
const COST_HEAD = ["When", "Agent", "Duration", "Turns", "Speech-to-text", "AI model", "Text-to-speech", "Total"];
const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 0, label: "All time" },
] as const;
const COST_PAGE = 10;

const rupees = (n: number | undefined, digits = 2) => (n === undefined ? "—" : `₹${formatMoney(n, digits)}`);

export default function DashboardPage() {
  const campaigns = useCampaigns();
  const agents = useAgents();
  const representatives = useRepresentatives();
  const plivoNumbers = usePlivoNumbers();
  const plivoPools = usePlivoPools();
  const [days, setDays] = useState<number>(30);

  const count = (q: { isLoading: boolean; data?: unknown[] }) => (q.isLoading || !q.data ? "—" : q.data.length);
  const running = campaigns.data?.filter((c) => c.status === "running").length ?? 0;
  const scheduled = campaigns.data?.filter((c) => c.status === "scheduled").length ?? 0;
  const activeReps = representatives.data?.filter((r) => r.active).length ?? 0;
  const recent = [...(campaigns.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6);

  const steps = [
    { done: !!agents.data?.length, label: "Create a calling agent", href: "/calling-agent/agents/new" },
    { done: !!plivoPools.data?.length, label: "Group Plivo numbers into a Plivo pool", href: "/number-pool" },
    { done: activeReps > 0, label: "Add a transfer agent to take interested leads", href: "/calling-agent?tab=representatives" },
    { done: !!campaigns.data?.length, label: "Create a campaign and upload its leads sheet", href: "/campaigns/new" },
  ];
  const loaded = [agents, plivoPools, representatives, campaigns].every((q) => q.isSuccess);
  const setupDone = steps.every((s) => s.done);

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Calls, spend and campaigns at a glance." backHref={null} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Campaigns"
          value={count(campaigns)}
          hint={campaigns.data ? `${running} running · ${scheduled} scheduled` : undefined}
          icon={<Megaphone size={16} />}
          href="/campaigns"
        />
        <StatTile label="Agents" value={count(agents)} icon={<Bot size={16} />} href="/calling-agent?tab=agents" />
        <StatTile
          label="Transfer agents"
          value={count(representatives)}
          hint={representatives.data ? `${activeReps} active` : undefined}
          icon={<PhoneForwarded size={16} />}
          href="/calling-agent?tab=representatives"
        />
        <StatTile
          label="Caller numbers"
          value={count(plivoNumbers)}
          hint={plivoPools.data ? `${plivoPools.data.length} pool${plivoPools.data.length === 1 ? "" : "s"}` : undefined}
          icon={<Phone size={16} />}
          href="/number-pool"
        />
      </div>

      <CostSection days={days} setDays={setDays} />

      <div className={clsx("grid gap-6", loaded && !setupDone && "lg:grid-cols-3")}>
        <Card
          flush
          title="Recent campaigns"
          className={loaded && !setupDone ? "lg:col-span-2" : undefined}
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
          ) : campaigns.isSuccess && recent.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              No campaigns yet.{" "}
              <Link href="/campaigns/new" className="font-medium text-accent-text underline underline-offset-2">
                Create one
              </Link>
            </p>
          ) : (
            <Table bare head={RECENT_HEAD} label="Recent campaigns">
              {campaigns.isLoading ? (
                <SkeletonRows rows={4} cols={RECENT_HEAD.length} />
              ) : (
                recent.map((c) => (
                  <LinkRow key={c.id} href={`/campaigns/${c.id}`}>
                    <td className="px-4 py-3 font-medium text-heading">{c.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="tnum whitespace-nowrap px-4 py-3 text-body">{formatWindow(c.window_start, c.window_end)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(c.updated_at)}</td>
                  </LinkRow>
                ))
              )}
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

/* --------------------------------- Costs ---------------------------------- */

function CostSection({ days, setDays }: { days: number; setDays: (d: number) => void }) {
  const summary = useQuery({
    queryKey: ["call-costs", "summary", days],
    queryFn: () => getCallCostSummary(days || undefined),
    retry: false,
  });
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ["call-costs", "list", page],
    queryFn: () => getCallCosts(page, COST_PAGE),
    retry: false,
    placeholderData: (prev) => prev,
  });
  const s = summary.data;
  const v = (n: React.ReactNode) => (summary.isLoading || !s ? "—" : n);
  const total = list.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / COST_PAGE));

  return (
    <section aria-labelledby="cost-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="cost-heading" className="text-lg font-semibold text-heading">
            AI call cost
          </h2>
          <p className="mt-0.5 text-sm text-muted">Speech-to-text, AI model and voice charges for every call, in rupees (before GST).</p>
        </div>
        <div role="radiogroup" aria-label="Period" className="inline-flex rounded-md border border-hairline bg-surface-input p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              role="radio"
              aria-checked={days === p.days}
              onClick={() => setDays(p.days)}
              className={clsx(
                "h-8 rounded px-3 text-sm font-medium transition-colors",
                days === p.days ? "bg-surface text-heading shadow-sm" : "text-muted hover:text-heading",
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Total AI cost"
              value={v(rupees(s?.total_cost))}
              icon={<IndianRupee size={16} />}
              hint={s ? `${rupees(s.average_per_call.total_cost, 3)} per call on average` : undefined}
            />
            <StatTile label="Calls" value={v(s?.calls.toLocaleString())} icon={<PhoneCall size={16} />} />
            <StatTile
              label="Talk time"
              value={v(formatDuration(s?.seconds))}
              icon={<Clock size={16} />}
              hint={s ? `${formatDuration(s.average_per_call.seconds)} per call on average` : undefined}
            />
            <StatTile
              label="Tokens used"
              value={v(((s?.prompt_tokens ?? 0) + (s?.completion_tokens ?? 0)).toLocaleString())}
              icon={<Sigma size={16} />}
              hint={s ? `${(s.tts_chars ?? 0).toLocaleString()} characters spoken` : undefined}
            />
          </div>

          <CostSplit summary={s} loading={summary.isLoading} />
        </>
      )}

      <Card flush title="Cost per call" description="Newest first. Each call's AI charges, split by service.">
        {list.isError ? (
          <div className="p-5">
            <ErrorState message={(list.error as Error).message} onRetry={() => list.refetch()} />
          </div>
        ) : (
          <div className="space-y-3 pb-3">
            <Table bare head={COST_HEAD} label="Cost per call">
              {list.isLoading ? (
                <SkeletonRows rows={5} cols={COST_HEAD.length} />
              ) : !list.data?.items.length ? (
                <TableMessage cols={COST_HEAD.length}>No calls have been costed yet.</TableMessage>
              ) : (
                list.data.items.map((c) => (
                  <tr key={c.call_uuid}>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(c.started_at ?? c.created_at)}</td>
                    <td className="px-4 py-3 text-heading">{c.agent_name || <span className="text-faint">—</span>}</td>
                    <td className="tnum whitespace-nowrap px-4 py-3 text-body">{formatDuration(c.duration_seconds)}</td>
                    <td className="tnum px-4 py-3 text-body">{c.turns}</td>
                    <td className="tnum px-4 py-3 text-body">{rupees(c.stt_cost, 3)}</td>
                    <td className="tnum px-4 py-3 text-body">{rupees(c.llm_cost, 3)}</td>
                    <td className="tnum px-4 py-3 text-body">{rupees(c.tts_cost, 3)}</td>
                    <td className="tnum px-4 py-3 font-semibold text-heading">{rupees(c.total_cost, 3)}</td>
                  </tr>
                ))
              )}
            </Table>
            {total > COST_PAGE && (
              <nav aria-label="Cost pages" className="flex items-center justify-between gap-3 px-4 text-sm text-muted">
                <span className="tnum">
                  {(page - 1) * COST_PAGE + 1}–{Math.min(page * COST_PAGE, total)} of {total} calls
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-9 rounded-md border border-hairline px-3 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Newer
                  </button>
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => setPage(page + 1)}
                    className="h-9 rounded-md border border-hairline px-3 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Older
                  </button>
                </span>
              </nav>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

/**
 * Where the AI money goes: one stacked bar (parts of a whole) with a labelled legend,
 * so the split never relies on colour alone. Hover a segment for its exact value.
 */
function CostSplit({ summary, loading }: { summary: CallCostSummary | undefined; loading: boolean }) {
  const parts = summary
    ? [
        { key: "stt", label: "Speech-to-text", detail: summary.rates.stt_model, value: summary.stt_cost, color: "var(--series-1)" },
        { key: "llm", label: "AI model", detail: summary.rates.llm_model, value: summary.llm_cost, color: "var(--series-2)" },
        { key: "tts", label: "Text-to-speech", detail: summary.rates.tts_model, value: summary.tts_cost, color: "var(--series-3)" },
      ]
    : [];
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <Card title="Where the cost goes" description="Share of AI spend in the selected period.">
      {loading ? (
        <Skeleton className="h-24 rounded-md" />
      ) : !total ? (
        <p className="py-4 text-center text-sm text-muted">No spend in this period.</p>
      ) : (
        <div className="space-y-4">
          <div
            className="flex h-4 w-full gap-[2px] overflow-hidden rounded"
            role="img"
            aria-label={parts.map((p) => `${p.label} ${share(p.value)}%`).join(", ")}
          >
            {parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <div
                  key={p.key}
                  title={`${p.label}: ${rupees(p.value)} (${share(p.value)}%)`}
                  className="h-full transition-opacity first:rounded-l last:rounded-r hover:opacity-80"
                  style={{ width: `${(p.value / total) * 100}%`, background: p.color, minWidth: 4 }}
                />
              ))}
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            {parts.map((p) => (
              <div key={p.key} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
                <div className="min-w-0">
                  <dt className="text-sm font-medium text-heading">{p.label}</dt>
                  <dd className="tnum text-sm text-body">
                    {rupees(p.value)} <span className="text-muted">· {share(p.value)}%</span>
                  </dd>
                  <dd className="truncate text-xs text-muted" title={p.detail}>
                    {p.detail}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Card>
  );
}
