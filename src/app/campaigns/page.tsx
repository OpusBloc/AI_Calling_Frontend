"use client";

import { useCampaigns } from "@/hooks/hooks";
import PageHeader from "@/components/PageHeader";
import CampaignsTab from "@/components/campaigns/CampaignsTab";

export default function CampaignsPage() {
  const campaignsQuery = useCampaigns();
  return (
    <div className="space-y-6 px-6 py-4">
      <PageHeader title="Campaigns" description="Create, schedule and monitor outbound calling campaigns." />
      <CampaignsTab
        campaigns={campaignsQuery.data ?? []}
        campaignsLoading={campaignsQuery.isLoading}
        campaignsError={campaignsQuery.isError ? campaignsQuery.error : null}
      />
    </div>
  );
}
