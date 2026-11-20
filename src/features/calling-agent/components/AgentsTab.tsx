"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bot, PenLine, Plus } from "lucide-react";

import { loadDraft } from "@/lib/agentDraft";
import { Agent, deleteAgent, listAgents, listVoiceCatalog } from "@/lib/callingAgentApi";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import { DeleteIconButton } from "@/components/ui/ActionIconButtons";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  ErrorState,
  LinkRow,
  Pagination,
  SectionHeader,
  Table,
  errorMessage,
  formatDate,
  usePagination,
} from "@/components/ui";
import { TableSkeleton, useSkeletonVisibility } from "@/components/skeletons";
import { AGENT_COLUMNS } from "@/components/skeletons/table-columns";
import { voiceCatalogKey } from "./voicePickerShared";

export default function AgentsTab() {
  const router = useRouter();
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: listAgents, retry: false });
  const { data } = agentsQuery;
  const error = agentsQuery.error ? errorMessage(agentsQuery.error) : null;
  const loading = agentsQuery.isLoading;
  const reload = () => agentsQuery.refetch();
  const { data: voiceCatalog } = useQuery({ queryKey: voiceCatalogKey, queryFn: listVoiceCatalog, retry: false });
  const showLoadingSkeleton = useSkeletonVisibility(loading && !data);
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
  <Button
    className="btn-blue"
    onClick={() => router.push("/calling-agent/agents/new")}
  >
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
        ) : (loading && !data) || showLoadingSkeleton ? (
          <Table head={AGENT_COLUMNS.map((column) => column.label)} columns={AGENT_COLUMNS} loading skeleton={<TableSkeleton columns={AGENT_COLUMNS} rows={6} />}>
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
            <div className="recent-table blue-table">
    <Table head={AGENT_COLUMNS.map((column) => column.label)} columns={AGENT_COLUMNS} label="Agents">
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
                    <td className="px-4 py-3 text-body">
                      {agent.llm_model || "_"}
                    </td>
                    <td className="px-4 py-3 text-body">
                      {agent.stt_model || "_"}
                    </td>
                    <td className="px-4 py-3 text-body">
                      {agent.voice
                        ? voiceCatalog?.voices.find((voice) => voice.voice_id === agent.voice)?.speaker ?? agent.voice
                        : "_"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(agent.updated_at)}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end">
                        <DeleteIconButton onClick={() => handleDelete(agent)} />
                      </div>
                    </td>
                  </LinkRow>
                );
              })}
            </Table>
            </div>
            <Pagination {...pagination} noun="agents" />
          </>
        )}
      </div>
    </section>
  );
}
