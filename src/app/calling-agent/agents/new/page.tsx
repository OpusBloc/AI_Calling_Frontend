"use client";

import dynamic from "next/dynamic";
import { AgentEditorSkeleton } from "@/components/skeletons";

const AgentEditor = dynamic(() => import("@/features/calling-agent/components/AgentEditor"), {
  loading: () => <AgentEditorSkeleton />,
});

export default function NewAgentPage() {
  return <AgentEditor agent={null} />;
}
