"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { getCampaign, getPlivoPool } from "@/lib/api";
import { getAgent, getRepresentative } from "@/lib/callingAgentApi";
import { Skeleton } from "@/components/skeletons";
import { navIcons, navItems } from "@/components/layout/navItems";

type Crumb = { label: string; href?: string; loading?: boolean };

export default function AppBreadcrumb() {
  const pathname = usePathname();
  const current = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ?? null;
  const agentId = pathname.match(/^\/calling-agent\/agents\/([^/]+)/)?.[1] ?? null;
  const representativeId = pathname.match(/^\/calling-agent\/representatives\/([^/]+)/)?.[1] ?? null;
  const campaignId = pathname.match(/^\/campaigns\/([^/]+)/)?.[1] ?? null;
  const poolId = pathname.match(/^\/number-pool\/pools\/([^/]+)/)?.[1] ?? null;

  const agent = useQuery({ queryKey: ["agents", "crumb", agentId], queryFn: () => getAgent(agentId as string), enabled: Boolean(agentId && agentId !== "new") });
  const representative = useQuery({ queryKey: ["representatives", "crumb", representativeId], queryFn: () => getRepresentative(representativeId as string), enabled: Boolean(representativeId && representativeId !== "new") });
  const campaign = useQuery({ queryKey: ["campaigns", campaignId], queryFn: () => getCampaign(campaignId as string), enabled: Boolean(campaignId && campaignId !== "new"), retry: false });
  const pool = useQuery({ queryKey: ["plivo-pools", poolId], queryFn: () => getPlivoPool(poolId as string), enabled: Boolean(poolId && poolId !== "new"), retry: false });

  if (!current) return null;

  const editing = pathname.endsWith("/edit");
  const crumbs: Crumb[] = [{ label: current.label, href: current.href }];

  if (campaignId) {
    const title = campaignId === "new" ? "New campaign" : campaign.data?.name;
    crumbs.push({ label: title ?? "Campaign", href: editing ? `/campaigns/${campaignId}` : undefined, loading: campaignId !== "new" && campaign.isLoading });
    if (editing) crumbs.push({ label: "Edit" });
  } else if (poolId) {
    const title = poolId === "new" ? "New pool" : pool.data?.name;
    crumbs.push({ label: title ?? "Pool", href: editing ? `/number-pool/pools/${poolId}` : undefined, loading: poolId !== "new" && pool.isLoading });
    if (editing) crumbs.push({ label: "Edit" });
  } else if (agentId) {
    if (agentId !== "new") crumbs.push({ label: "Agents", href: "/calling-agent?tab=agents" });
    const title = agentId === "new" ? "New agent" : agent.data?.name;
    crumbs.push({ label: title ?? "Agent", href: editing ? `/calling-agent/agents/${agentId}` : undefined, loading: agentId !== "new" && agent.isLoading });
    if (editing) crumbs.push({ label: "Edit" });
  } else if (representativeId) {
    crumbs.push({ label: "Call Transfer", href: "/calling-agent?tab=representatives" });
    const title = representativeId === "new" ? "New transfer agent" : representative.data?.name;
    crumbs.push({ label: title ?? "Transfer agent", href: editing ? `/calling-agent/representatives/${representativeId}` : undefined, loading: representativeId !== "new" && representative.isLoading });
    if (editing) crumbs.push({ label: "Edit" });
  }

  if (crumbs.length === 1) crumbs[0].href = undefined;
  const visibleFrom = Math.max(0, crumbs.length - 2);
  const RootIcon = navIcons[current.icon];

  return (
    <nav aria-label="Breadcrumb" className="min-w-0 overflow-hidden">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const collapsed = crumbs.length > 2 && index < visibleFrom;
          return (
            <li key={`${crumb.label}-${index}`} className={`flex min-w-0 items-center gap-1 ${collapsed ? "max-sm:hidden" : ""}`}>
              {index > 0 && <ChevronRight size={14} className={`shrink-0 text-faint ${index === visibleFrom && visibleFrom > 0 ? "max-sm:hidden" : ""}`} aria-hidden />}
              {index === 0 && <RootIcon size={16} className="mr-1 shrink-0 text-muted" aria-hidden />}
              {index === visibleFrom && visibleFrom > 0 && (
                <span className="mr-1 text-muted sm:hidden" aria-hidden>…</span>
              )}
              {crumb.loading ? (
                <span aria-busy="true" aria-label="Loading page name" className="inline-flex items-center"><Skeleton width={88} height={14} radius={4} /></span>
              ) : crumb.href ? (
                <Link href={crumb.href} className="shrink-0 rounded-sm text-muted hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="min-w-0 truncate font-semibold text-heading">{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
