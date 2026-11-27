"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, ChevronLeft, ChevronRight, PenLine, Plus } from "lucide-react";

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
  SearchInput,
  Table,
  TableMessage,
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
  const [search, setSearch] = useState("");
  const [newDraft] = useState(() => loadDraft(null));

  const agents = data ?? [];
  const query = search.trim().toLowerCase();
  const filteredAgents = query
    ? agents.filter((agent) => {
        const speaker = agent.voice
          ? voiceCatalog?.voices.find((voice) => voice.voice_id === agent.voice)?.speaker
          : "";
        return [agent.name, agent.llm_model, agent.stt_model, agent.voice, speaker]
          .some((value) => value?.toLowerCase().includes(query));
      })
    : agents;
  const pagination = usePagination(filteredAgents, 6);
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
    className="btn-blue shrink-0 whitespace-nowrap"
    onClick={() => router.push("/calling-agent/agents/new")}
  >
    {newDraft ? <PenLine size={16} aria-hidden /> : <Plus size={16} aria-hidden />} {newAgentLabel}
  </Button>
);

  return (
    <section>
      <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button type="button" aria-label="Back to dashboard" title="Back to dashboard" onClick={() => router.push("/")} className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-heading">Agents</h2>
            <p className="mt-0.5 line-clamp-2 max-w-sm text-sm text-muted">
              Each agent is a voice persona: intro, rules, knowledge, ending and optional notes. Campaigns pick one agent.
            </p>
          </div>
        </div>
        {agents.length > 0 && (
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                pagination.setPage(1);
              }}
              placeholder="Search agents"
              className="agent-search min-w-0 w-full max-w-[220px]"
            />
            {newButton}
          </div>
        )}
      </div>

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
                {filteredAgents.length === 0 ? (
                  <TableMessage cols={AGENT_COLUMNS.length}>No agents match your search.</TableMessage>
                ) : pagination.pageItems.map((agent) => {
                  const hasDraft = !!loadDraft(agent.id);
                  return (
                    <LinkRow key={agent.id} href={`/calling-agent/agents/${agent.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-medium text-heading">
                          {agent.name}
                          {hasDraft && <Badge tone="neutral">Unsaved changes</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-body">{agent.llm_model || "_"}</td>
                      <td className="px-4 py-3 text-body">{agent.stt_model || "_"}</td>
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
            {filteredAgents.length > 6 && (
              <div className="flex items-center justify-between gap-3 text-sm text-muted">
                <button
                  type="button"
                  onClick={() => pagination.setPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn-blue-filled inline-flex min-h-10 items-center gap-1 rounded-md px-4 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} aria-hidden /> Previous
                </button>
                <span aria-live="polite">Page {pagination.page} of {pagination.pageCount}</span>
                <button
                  type="button"
                  onClick={() => pagination.setPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pageCount}
                  className="btn-blue-filled inline-flex min-h-10 items-center gap-1 rounded-md px-4 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
