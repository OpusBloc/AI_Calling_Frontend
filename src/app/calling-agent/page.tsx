"use client";

import { Suspense, useState } from "react";
import { Bot, PhoneCall, PhoneForwarded } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import AgentsTab from "@/components/calling-agent/AgentsTab";
import RepresentativesTab from "@/components/calling-agent/RepresentativesTab";
import TestCallDrawer from "@/components/calling-agent/TestCallDrawer";
import { Button, Tabs, useTabParam } from "@/components/ui";

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
      <PageHeader
        title="Calling Agent"
        description="Manage the AI voice agents your campaigns use and configure call transfer settings for live calls."
        actions={
          <Button variant="secondary" onClick={() => setTesting(true)}>
            <PhoneCall size={16} aria-hidden /> Test call
          </Button>
        }
      />
      {testing && <TestCallDrawer onClose={() => setTesting(false)} />}
      <div>
        <Suspense>
          <CallingAgentTabs />
        </Suspense>
      </div>
    </div>
  );
}
