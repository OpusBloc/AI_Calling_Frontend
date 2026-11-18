"use client";

import dynamic from "next/dynamic";
import { CampaignsRouteSkeleton } from "@/components/skeletons";

const CampaignsTab = dynamic(() => import("@/features/campaigns/components/CampaignsTab"), {
  loading: () => <CampaignsRouteSkeleton />,
});

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <CampaignsTab />
    </div>
  );
}
