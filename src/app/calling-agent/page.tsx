"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { AudioLines, Bot, PhoneCall, PhoneForwarded } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import AgentsTab from "@/components/calling-agent/AgentsTab";
import RepresentativesTab from "@/components/calling-agent/RepresentativesTab";
import AgentVoiceTab from "@/components/calling-agent/AgentVoiceTab";
import TestCallDrawer from "@/components/calling-agent/TestCallDrawer";
import { Button, Tabs, useTabParam } from "@/components/ui";

const TABS = [
  { id: "agents", label: "Agents", icon: Bot, component: AgentsTab },
  { id: "voice", label: "Agent Voice", icon: AudioLines, component: AgentVoiceTab },
  { id: "representatives", label: "Call Transfer", icon: PhoneForwarded, component: RepresentativesTab },
] as const;

function CallingAgentTabs() {
  const [active, setActive] = useTabParam(TABS.map((t) => t.id));
  return (
    <>
      <Tabs label="Calling agent sections" tabs={TABS} active={active} onChange={setActive} />
      <div role="tabpanel" className="pt-6">
        {active === "agents" ? <AgentsTab /> : <RepresentativesTab />}
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
