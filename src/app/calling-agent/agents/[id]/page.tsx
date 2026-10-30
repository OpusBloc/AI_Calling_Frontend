"use client";

import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

import AgentEditor from "@/components/calling-agent/AgentEditor";
import PageHeader from "@/components/PageHeader";
import { Button, EmptyState, ErrorState, Loading, useLoad } from "@/components/ui";
import { getAgent } from "@/lib/callingAgentApi";

export default function AgentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const loader = useCallback(() => getAgent(id), [id]);
  const { data: agent, error, loading, reload } = useLoad(loader);

  if (loading && !agent) return <Loading label="Loading agent" />;

  if (!agent) {
    const crumbs = [{ label: "Calling Agent", href: "/calling-agent?tab=agents" }, { label: "Agent" }];
    const notFound = !error || /not found/i.test(error);
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader breadcrumbs={crumbs} title={notFound ? "Agent not found" : "Agent"} />
        {notFound ? (
          <EmptyState
            title="This agent doesn't exist"
            text="It may have been deleted, or the link is wrong."
            action={<Button onClick={() => router.push("/calling-agent?tab=agents")}>Back to agents</Button>}
          />
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </div>
    );
  }

  return <AgentEditor key={agent.id} agent={agent} />;
}
