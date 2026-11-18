"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import {
  CallingAgentSkeleton,
  CampaignsRouteSkeleton,
  DashboardSkeleton,
  NumberPoolSkeleton,
  TemplatesSkeleton,
} from "@/components/skeletons";
import FeatureAccessGate from "@/components/auth/FeatureAccessGate";

export type HeroSectionId = "dashboard" | "campaigns" | "number-pool" | "calling-agent" | "templates";

const Dashboard = dynamic(() => import("@/features/dashboard/components/DashboardPage"), {
  loading: () => <DashboardSkeleton />,
});
const Campaigns = dynamic(() => import("@/features/campaigns/components/CampaignsPage"), {
  loading: () => <CampaignsRouteSkeleton />,
});
const NumberPool = dynamic(() => import("@/features/number-pool/components/NumberPoolPage"), {
  loading: () => <NumberPoolSkeleton />,
});
const CallingAgent = dynamic(() => import("@/features/calling-agent/components/CallingAgentPage"), {
  loading: () => <CallingAgentSkeleton />,
});
const Templates = dynamic(() => import("@/features/calling-agent/components/TemplatesPage"), {
  loading: () => <TemplatesSkeleton />,
});

const sections: Record<HeroSectionId, ComponentType> = {
  dashboard: Dashboard,
  campaigns: Campaigns,
  "number-pool": NumberPool,
  "calling-agent": CallingAgent,
  templates: Templates,
};

export default function HeroSection({ section }: { section: HeroSectionId }) {
  const Section = sections[section];
  const featureBySection: Partial<Record<HeroSectionId, string>> = {
    campaigns: "campaigns",
    "number-pool": "plivo",
    templates: "whatsapp",
  };
  const feature = featureBySection[section];
  return feature ? (
    <FeatureAccessGate feature={feature}>
      <Section />
    </FeatureAccessGate>
  ) : (
    <Section />
  );
}
