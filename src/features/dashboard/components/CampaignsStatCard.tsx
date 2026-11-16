import { Megaphone } from "lucide-react";

import StatCard from "@/features/dashboard/components/StatCard";
import { DonutRing } from "@/features/dashboard/components/StatVisuals";

type Props = {
  running: unknown;
  scheduled: unknown;
  total: unknown;
  loading?: boolean;
};

function countValue(value: unknown): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : 0;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export default function CampaignsStatCard({ running, scheduled, total: rawTotal, loading = false }: Props) {
  const activeCount = countValue(running);
  const total = Math.max(countValue(rawTotal), activeCount + countValue(scheduled));
  return (
    <StatCard
      title="Campaigns"
      icon={<Megaphone size={22} />}
      accent={{ light: "var(--campaign-stat-accent)", dark: "var(--series-2)" }}
      value={loading ? "—" : total}
      label={`${activeCount} active`}
      loading={loading}
      href="/campaigns"
    >
      <DonutRing
        value={activeCount}
        max={total}
        color="var(--donut-accent)"
        trackColor="var(--chart-grid)"
        ariaLabel={`${activeCount} active campaigns out of ${total}`}
        tooltip={`${activeCount} active of ${total} campaigns`}
      />
    </StatCard>
  );
}
