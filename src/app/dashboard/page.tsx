"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Bot, CheckCircle2, Circle, Megaphone, Phone, PhoneForwarded } from "lucide-react";

import { useAgents, useCampaigns, usePlivoNumbers, usePlivoPools, useRepresentatives } from "@/hooks/hooks";
import PageHeader from "@/components/PageHeader";
import { formatWindow } from "@/components/campaigns/CampaignsTab";
import { Card, ErrorState, LinkRow, SkeletonRows, StatTile, StatusBadge, Table, formatDate } from "@/components/ui";

const RECENT_HEAD = ["Campaign", "Status", "Calling window", "Updated"];

export default function DashboardPage() {
  const campaigns = useCampaigns();
  const agents = useAgents();
  const representatives = useRepresentatives();
  const plivoNumbers = usePlivoNumbers();
  const plivoPools = usePlivoPools();

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
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="An overview of your calling activity." backHref={null} />

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

      <div className={clsx("grid gap-6", loaded && !setupDone && "lg:grid-cols-3")}>
        <Card
          flush
          title="Recent campaigns"
          className={loaded && !setupDone ? "lg:col-span-2" : undefined}
          actions={
            <Link href="/campaigns" className="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline underline-offset-2">
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
              <Link href="/campaigns" className="font-medium text-accent-text underline underline-offset-2">
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
                  <Link
                    href={s.href}
                    className="flex min-h-10 items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-surface-hover"
                  >
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
