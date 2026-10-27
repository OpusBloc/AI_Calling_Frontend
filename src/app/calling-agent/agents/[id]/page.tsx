"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import AgentEditor from "@/components/calling-agent/AgentEditor";
import { ErrorBanner, Loading, useLoad } from "@/components/calling-agent/ui";
import { getAgent } from "@/lib/callingAgentApi";

export default function AgentPage() {
  const { id } = useParams<{ id: string }>();
  const loader = useCallback(() => getAgent(id), [id]);
  const { data: agent, error, loading } = useLoad(loader);

  if (loading && !agent) return <Loading />;

  if (!agent) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Link
          href="/calling-agent?tab=agents"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-heading"
        >
          <ArrowLeft size={16} /> Agents
        </Link>
        <ErrorBanner message={error ?? "Agent not found."} />
      </div>
    );
  }

  return <AgentEditor key={agent.id} agent={agent} />;
}
