"use client";

import { useParams } from "next/navigation";

import { useCampaign } from "@/hooks/hooks";
import CampaignForm from "@/components/campaigns/CampaignForm";
import { EditLoadState } from "@/components/ui";

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const campaign = useCampaign(id);
  if (!campaign.data) {
    return (
      <EditLoadState
        query={campaign}
        noun="campaign"
        breadcrumbs={[{ label: "Campaigns", href: "/campaigns" }, { label: "Edit" }]}
        backHref="/campaigns"
      />
    );
  }
  return <CampaignForm key={campaign.data.id} campaign={campaign.data} />;
}
