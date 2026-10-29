"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import CampaignsTab from "@/components/campaigns/CampaignsTab";
import { Button } from "@/components/ui";

export default function CampaignsPage() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Upload a sheet of leads, pick an agent, and schedule the calls."
        actions={
          <Button onClick={() => router.push("/campaigns/new")}>
            <Plus size={16} aria-hidden /> New campaign
          </Button>
        }
      />
      <CampaignsTab />
    </div>
  );
}
