import { Megaphone } from "lucide-react";

import StatCard from "@/features/dashboard/components/StatCard";

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
      tone="pink"
      value={loading ? "-" : total}
      label={`${activeCount} active`}
      loading={loading}
      href="/campaigns"
    />
  );
}
