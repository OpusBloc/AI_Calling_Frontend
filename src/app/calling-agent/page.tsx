"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Bot, PhoneCall, PhoneForwarded } from "lucide-react";

import PageHeader from "@/components/PageHeader";
import AgentsTab from "@/components/calling-agent/AgentsTab";
import RepresentativesTab from "@/components/calling-agent/RepresentativesTab";
import TestCallDrawer from "@/components/calling-agent/TestCallDrawer";
import { Button } from "@/components/calling-agent/ui";

const TABS = [
  { id: "agents", label: "Agents", icon: Bot, component: AgentsTab },
  { id: "representatives", label: "Representatives", icon: PhoneForwarded, component: RepresentativesTab },
] as const;

function CallingAgentTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active tab lives in ?tab= so it survives reloads and can be linked to
  const active = TABS.find((t) => t.id === searchParams.get("tab")) ?? TABS[0];
  const ActiveTab = active.component;

  return (
    <>
      <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto border-b border-hairline">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === active.id}
            onClick={() => router.replace(`${pathname}?tab=${id}`, { scroll: false })}
            className={clsx(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              id === active.id
                ? "border-accent text-accent-text"
                : "border-transparent text-muted hover:text-heading",
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="pt-6">
        <ActiveTab key={active.id} />
      </div>
    </>
  );
}

export default function CallingAgentPage() {
  const [testing, setTesting] = useState(false);

  return (
    <div>
      <PageHeader
        title="Calling Agent"
        description="Manage the AI voice agents your campaigns use, and the representatives live calls are transferred to."
        actions={
          <Button variant="secondary" onClick={() => setTesting(true)}>
            <PhoneCall size={16} /> Test call
          </Button>
        }
      />
      {testing && <TestCallDrawer onClose={() => setTesting(false)} />}
      <Suspense>
        <CallingAgentTabs />
      </Suspense>
    </div>
  );
}
