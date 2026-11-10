import { Megaphone } from "lucide-react";

import { StatTile } from "@/components/ui";

type Props = {
  running: unknown;
  scheduled: unknown;
  total: unknown;
};

function countValue(value: unknown): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : 0;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export default function CampaignsStatCard({ running, scheduled, total: rawTotal }: Props) {
  const total = Math.max(countValue(rawTotal), countValue(running) + countValue(scheduled));
  return <StatTile label="Campaigns" value={total} icon={<Megaphone size={16} />} href="/campaigns" />;
}
