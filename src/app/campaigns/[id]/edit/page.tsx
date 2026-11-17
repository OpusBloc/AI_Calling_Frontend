"use client";

import { useParams } from "next/navigation";

import { useCampaign } from "@/hooks/hooks";
import dynamic from "next/dynamic";
import { FormSkeleton, RouteSkeleton } from "@/components/skeletons";
import { EditLoadState } from "@/components/ui";

const CampaignForm = dynamic(() => import("@/features/campaigns/components/CampaignForm"), {
  loading: () => <RouteSkeleton><div className="mx-auto max-w-5xl space-y-5"><h1 className="text-2xl font-semibold text-heading">Edit campaign</h1><div className="flex gap-2 border-b border-hairline pb-3">{["Details & Leads", "Calling & Retries", "Timing"].map((label) => <span key={label} className="rounded-md px-3 py-2 text-sm text-muted">{label}</span>)}</div><FormSkeleton sections={3} /></div></RouteSkeleton>,
});

export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const campaign = useCampaign(id);
  if (!campaign.data) {
    return (
      <EditLoadState
        query={campaign}
        noun="campaign"
      />
    );
  }
  return <CampaignForm key={campaign.data.id} campaign={campaign.data} />;
}
