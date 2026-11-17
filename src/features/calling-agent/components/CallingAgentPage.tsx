"use client";

import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { Bot, PhoneForwarded } from "lucide-react";

import AgentsTab from "@/features/calling-agent/components/AgentsTab";
import RepresentativesTab from "@/features/calling-agent/components/RepresentativesTab";
import DrawerLoadingPlaceholder from "@/features/calling-agent/components/DrawerLoadingPlaceholder";
import { Tabs, useTabParam } from "@/components/ui";
import { CallingAgentSkeleton } from "@/components/skeletons";

const TestCallDrawer = dynamic(() => import("@/features/calling-agent/components/TestCallDrawer"), {
  loading: () => <DrawerLoadingPlaceholder />,
});

const TABS = [
  { id: "agents", label: "Agents", icon: Bot, component: AgentsTab },
  { id: "representatives", label: "Call Transfer", icon: PhoneForwarded, component: RepresentativesTab },
] as const;


function CallingAgentTabs() {
  const [active, setActive] = useTabParam(TABS.map((t) => t.id));
  const ActiveTab = TABS.find((t) => t.id === active)!.component;
  return (
    <>
      <Tabs label="Calling agent sections" tabs={TABS} active={active} onChange={setActive} />
      <div role="tabpanel" className="pt-6">
        <ActiveTab />
      </div>
    </>
  );
}

export default function CallingAgentPage() {
  const [testing, setTesting] = useState(false);

  return (
    <div className="space-y-6">
      {testing && <TestCallDrawer onClose={() => setTesting(false)} />}
      <div>
        <Suspense fallback={<CallingAgentSkeleton />}>
          <CallingAgentTabs />
        </Suspense>
      </div>
    </div>
  );
}
