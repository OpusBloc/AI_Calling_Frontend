"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Plus, Trash2 } from "lucide-react";

import { loadDraft } from "@/lib/agentDraft";
import { Agent, deleteAgent, listAgents } from "@/lib/callingAgentApi";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  IconButton,
  Loading,
  Pagination,
  SectionHeader,
  Table,
  errorMessage,
  formatDate,
  useLoad,
  usePagination,
} from "./ui";

export default function AgentsTab() {
  const router = useRouter();
  const { data, error, loading, reload } = useLoad(listAgents);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newDraft] = useState(() => loadDraft(null));

  const agents = data ?? [];
  const pagination = usePagination(agents);
  const newAgentLabel = newDraft ? "Continue draft" : "New agent";

  const handleDelete = async (agent: Agent) => {
    if (!window.confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteAgent(agent.id);
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const newButton = (
    <Button onClick={() => router.push("/calling-agent/agents/new")}>
      {newDraft ? <PenLine size={16} /> : <Plus size={16} />} {newAgentLabel}
    </Button>
  );

  return (
    <section>
      <SectionHeader
        title="Agents"
        description="Each agent is a voice persona: intro, rules, knowledge, ending and optional notes. Campaigns pick one agent."
        action={newButton}
      />

      <div className="space-y-3">
        <ErrorBanner message={error ?? actionError} />

        {loading && !data ? (
          <Loading />
        ) : agents.length === 0 ? (
          <EmptyState title="No agents yet" text="Create your first calling agent." action={newButton} />
        ) : (
          <>
            <Table head={["Name", "Greeting", "Intro", "Updated", ""]}>
              {pagination.pageItems.map((agent) => {
                const hasDraft = !!loadDraft(agent.id);
                return (
                  <tr
                    key={agent.id}
                    onClick={() => router.push(`/calling-agent/agents/${agent.id}`)}
                    className="cursor-pointer align-top transition-colors hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-heading">
                        {agent.name}
                        {hasDraft && <Badge tone="neutral">Unsaved changes</Badge>}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-body">
                      <span className="line-clamp-2">
                        {agent.greeting || <span className="text-faint">Default</span>}
                      </span>
                    </td>
                    <td className="max-w-sm px-4 py-3 text-muted">
                      <span className="line-clamp-2">{agent.intro}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(agent.updated_at)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <IconButton label="Delete agent" tone="danger" onClick={() => handleDelete(agent)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </td>
                  </tr>
                );
              })}
            </Table>
            <Pagination {...pagination} noun="agents" />
          </>
        )}
      </div>
    </section>
  );
}
