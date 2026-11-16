"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";

import AgentEditor from "@/features/calling-agent/components/AgentEditor";
import PageHeader from "@/components/PageHeader";
import { EmptyState, ErrorState, useLoad } from "@/components/ui";
import { AgentDetailsSkeleton, useSkeletonVisibility } from "@/components/skeletons";
import { getAgent } from "@/lib/callingAgentApi";

export default function AgentPage() {
  const { id } = useParams<{ id: string }>();
  const loader = useCallback(() => getAgent(id), [id]);
  const { data: agent, error, loading, reload } = useLoad(loader);
  const showAgentSkeleton = useSkeletonVisibility(loading && !agent);

  if ((loading && !agent) || showAgentSkeleton) return showAgentSkeleton ? <AgentDetailsSkeleton /> : null;

  if (!agent) {
    const notFound = !error || /not found/i.test(error);
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader title={notFound ? "Agent not found" : "Agent"} />
        {notFound ? (
          <EmptyState
            title="This agent doesn't exist"
            text="It may have been deleted, or the link is wrong."
          />
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </div>
    );
  }

  return <AgentEditor key={agent.id} agent={agent} />;
}
