"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, PenLine, Plus, Trash2 } from "lucide-react";

import { loadDraft } from "@/lib/agentDraft";
import { Agent, deleteAgent, listAgents } from "@/lib/callingAgentApi";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  ErrorState,
  IconButton,
  LinkRow,
  Pagination,
  SkeletonRows,
  SectionHeader,
  Table,
  errorMessage,
  formatDate,
  useLoad,
  usePagination,
} from "@/components/ui";

export default function AgentsTab() {
  const router = useRouter();
  const { data, error, loading, reload } = useLoad(listAgents);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newDraft] = useState(() => loadDraft(null));

  const agents = data ?? [];
  const pagination = usePagination(agents);
  const newAgentLabel = newDraft ? "Continue draft" : "New agent";

  const handleDelete = async (agent: Agent) => {
    const ok = await confirmDialog({
      title: "Delete agent?",
      message: `"${agent.name}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setActionError(null);
    try {
      await deleteAgent(agent.id);
      showSuccessNotification(`"${agent.name}" was deleted.`, { title: "Agent deleted" });
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const newButton = (
    <Button onClick={() => router.push("/calling-agent/agents/new")}>
      {newDraft ? <PenLine size={16} aria-hidden /> : <Plus size={16} aria-hidden />} {newAgentLabel}
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
        <ErrorBanner message={actionError} />

        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <Table head={["Name", "Greeting", "Intro", "Updated", ""]}>
            <SkeletonRows cols={5} />
          </Table>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={<Bot size={20} />}
            title="No agents yet"
            text="An agent is the voice persona that talks on every call: its script, rules and knowledge."
            action={newButton}
          />
        ) : (
          <>
            <Table head={["Name", "Greeting", "Intro", "Updated", ""]} label="Agents">
              {pagination.pageItems.map((agent) => {
                const hasDraft = !!loadDraft(agent.id);
                return (
                  <LinkRow key={agent.id} href={`/calling-agent/agents/${agent.id}`}>
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
                    <td className="px-4 py-2">
                      <div className="flex justify-end">
                        <IconButton label={`Delete ${agent.name}`} tone="danger" onClick={() => handleDelete(agent)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </LinkRow>
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
