"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PartDraft } from "@/lib/agentDraft";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  History,
  PhoneCall,
  Save,
  Trash2,
  X,
} from "lucide-react";

import {
  AgentDraft,
  clearDraft,
  draftFromAgent,
  emptyDraft,
  isPartFilled,
  loadDraft,
  missingRequired,
  saveDraft,
  toCreateForm,
  toUpdateForm,
} from "@/lib/agentDraft";
import {
  AGENT_PARTS,
  Agent,
  AgentPart,
  createAgent,
  deleteAgent,
  getAgentModelOptions,
  updateAgent,
} from "@/lib/callingAgentApi";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import FeatureAccessGate from "@/components/auth/FeatureAccessGate";
import { FormSkeleton } from "@/components/skeletons";
import {
  Button,
  ErrorBanner,
  errorMessage,
  formatDate,
} from "@/components/ui";
import DrawerLoadingPlaceholder from "./DrawerLoadingPlaceholder";

const StepLoadingPlaceholder = () => <FormSkeleton sections={2} />;
const VoicePicker = dynamic(() => import("./VoicePicker"), { loading: StepLoadingPlaceholder });
const ClassificationsStep = dynamic(() => import("./ClassificationsStep"), { loading: StepLoadingPlaceholder });
const WhatsAppMessagesField = dynamic(() => import("./WhatsAppMessagesField"), { loading: StepLoadingPlaceholder });
const AgentDetailsTab = dynamic(() => import("./AgentDetailsTab"), { loading: StepLoadingPlaceholder });
const AgentPromptTab = dynamic(() => import("./AgentPromptTab"), { loading: StepLoadingPlaceholder });
const AgentReview = dynamic(() => import("./AgentReview"), { loading: StepLoadingPlaceholder });

const TestCallDrawer = dynamic(() => import("./TestCallDrawer"), {
  loading: () => <DrawerLoadingPlaceholder />,
});
const AgentTestCallsDrawer = dynamic(() => import("./AgentTestCallsDrawer"), {
  loading: () => <DrawerLoadingPlaceholder />,
});



// Intro, Rules, Knowledge, Ending and Extra notes all live inside the single "prompt" tab
const TABS = [
  { id: "details", label: "Details" },
  { id: "voice", label: "Voice" },
  { id: "prompt", label: "Prompt" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "classifications", label: "Classifications" },
  { id: "review", label: "Review" },
];

const OPTIONAL_TABS = ["whatsapp", "classifications"];

const isPart = (id: string): id is AgentPart =>
  (AGENT_PARTS as readonly string[]).includes(id);

// Maps any part name ("rules", "ending", …) or old saved tab id onto the tab that contains it
const tabFor = (id: string) => (isPart(id) ? "prompt" : id);

const withDefaultModels = (
  draft: AgentDraft,
  options: Awaited<ReturnType<typeof getAgentModelOptions>>,
): AgentDraft => {
  const llmProvider =
    draft.llmProvider ||
    (options.llm_provider.includes("sarvam")
      ? "sarvam"
      : options.llm_provider[0] ?? "");
  const sttProvider =
    draft.sttProvider ||
    (options.stt_provider.includes("sarvam")
      ? "sarvam"
      : options.stt_provider[0] ?? "");

  return {
    ...draft,
    llmProvider,
    llmModel: draft.llmModel || options.llm_model[llmProvider]?.[0] || "",
    sttProvider,
    sttModel: draft.sttModel || options.stt_model[sttProvider]?.[0] || "",
  };
};

const comparable = (d: AgentDraft) =>
  JSON.stringify({
    name: d.name,
    greeting: d.greeting,
    voice: d.voice,
    primary: d.primaryLanguage,
    secondary: d.secondaryLanguage,
    llmProvider: d.llmProvider,
    llmModel: d.llmModel,
    sttProvider: d.sttProvider,
    sttModel: d.sttModel,
    silenceCheck: d.silenceCheckSeconds,
    silencePrompt: d.silencePrompt,
    silenceHangup: d.silenceHangupSeconds,
    secondLineYes: d.secondLineYes,
    secondLineNo: d.secondLineNo,
    interruptionMinWords: d.interruptionMinWords,
    whatsapp: d.whatsappMessageIds,
    parts: d.parts,
    classifications: d.classifications,
  });

export default function AgentEditor({
  agent: initialAgent,
}: {
  agent: Agent | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const agentId = initialAgent?.id ?? null;
  const isNew = agentId === null;



  const modelOptions = useQuery({
    queryKey: ["agent-model-options"],
    queryFn: getAgentModelOptions,
    retry: false,
  });

  const [agent, setAgent] = useState(initialAgent);
  const baseline = useMemo(
    () => {
      const draft = agent ? draftFromAgent(agent) : emptyDraft();
      return modelOptions.data
        ? withDefaultModels(draft, modelOptions.data)
        : draft;
    },
    [agent, modelOptions.data],
  );

  // Restore an unsaved local draft if there is one
  const [restored] = useState(() => loadDraft(agentId));
  const [draft, setDraft] = useState<AgentDraft>(() => restored ?? baseline);
  const [showRestored, setShowRestored] = useState(!!restored);
  const [storageOk, setStorageOk] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [viewingTestCalls, setViewingTestCalls] = useState(false);
  // Which sub-tab is open inside the Prompt tab
  const [promptPart, setPromptPart] = useState<AgentPart>(AGENT_PARTS[0]);

  useEffect(() => {
    if (modelOptions.data) {
      setDraft((current) => withDefaultModels(current, modelOptions.data));
    }
  }, [modelOptions.data]);

  const dirty = comparable(draft) !== comparable(baseline);
  const missing = missingRequired(draft);

  // Persist every change locally; a refresh picks up exactly where the user left off
  useEffect(() => {
    if (dirty) setStorageOk(saveDraft(agentId, draft));
    else clearDraft(agentId);
  }, [draft, dirty, agentId]);

  // Warn before closing the tab only if the draft couldn't be stored
  useEffect(() => {
    if (!dirty || storageOk) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, storageOk]);

  const tabIndex = Math.max(
    0,
    TABS.findIndex((t) => t.id === tabFor(draft.tab)),
  );

  // Accepts a tab id or a part name; part names open the Prompt tab on that sub-tab
  const goTo = (target: string) => {
    setDraft((d) => ({ ...d, tab: tabFor(target) }));
    if (isPart(target)) setPromptPart(target);
  };
  const setPart = (part: AgentPart, value: PartDraft) =>
    setDraft((d) => ({ ...d, parts: { ...d.parts, [part]: value } }));

  const tabDone = (id: string) => {
    if (id === "details") return !!draft.name.trim();
    if (id === "voice") return !!draft.voice;
    if (id === "review") return false;
    if (id === "prompt") {
      // Done once every required part is filled (Extra notes is optional)
      return AGENT_PARTS.filter((p) => p !== "extra").every((p) =>
        isPartFilled(draft.parts[p]),
      );
    }
    if (id === "whatsapp") return draft.whatsappMessageIds.length > 0;
    if (id === "classifications")
      return (draft.classifications?.length ?? 0) > 0;
    return false;
  };

  const handleDiscard = async () => {
    const ok = await confirmDialog({
      title: isNew ? "Discard draft?" : "Discard changes?",
      message: isNew
        ? "This draft will be cleared and you'll start over."
        : "Your unsaved changes will be lost.",
      confirmLabel: "Discard",
    });
    if (!ok) return;
    clearDraft(agentId);
    setDraft({ ...baseline, tab: draft.tab });
    setShowRestored(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (missing.length) {
      goTo(missing[0]);
      setError("Fill in every required section before saving.");
      showErrorNotification("Fill in every required section before saving.", {
        title: "Agent not saved",
      });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await createAgent(toCreateForm(draft));
        clearDraft(null);
        await qc.invalidateQueries({ queryKey: ["agents"] });
        showSuccessNotification(`"${created.name}" was created.`, {
          title: "Agent created",
        });
        router.replace(`/calling-agent/agents/${created.id}`);
        return;
      }
      const form = toUpdateForm(draft, agent!);
      const updated = form ? await updateAgent(agent!.id, form) : agent!;
      clearDraft(agentId);
      await qc.invalidateQueries({ queryKey: ["agents"] });
      setAgent(updated);
      setDraft({ ...draftFromAgent(updated), tab: draft.tab });
      setShowRestored(false);
      showSuccessNotification(
        form
          ? `"${updated.name}" was updated.`
          : "There were no changes to save.",
        {
          title: form ? "Agent saved" : "Nothing to save",
        },
      );
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      // Backend errors are prefixed with the part name ("rules: …") — jump there
      const part = AGENT_PARTS.find((p) => message.startsWith(p));
      if (part) goTo(part);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    const ok = await confirmDialog({
      title: "Delete agent?",
      message: `"${agent.name}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      await deleteAgent(agent.id);
      clearDraft(agentId);
      await qc.invalidateQueries({ queryKey: ["agents"] });
      showSuccessNotification(`"${agent.name}" was deleted.`, {
        title: "Agent deleted",
      });
      router.replace("/?tab=calling-agent&callingTab=agents");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const activeTab = TABS[tabIndex];

  return (
    <div className="mx-auto max-w-6xl">


      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-heading sm:text-[28px]">
            {isNew ? "New agent" : agent!.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isNew
              ? "Fill in each section. Your progress is saved in this browser until you create the agent."
              : `Created ${formatDate(agent!.created_at)} · Updated ${formatDate(agent!.updated_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DraftStatus dirty={dirty} storageOk={storageOk} />
{dirty && (
  <Button className="btn-blue" onClick={handleDiscard} disabled={saving}>
    {isNew ? "Discard draft" : "Discard changes"}
  </Button>
)}
          {!isNew && (
            <Button
              variant="secondary"
              className="btn-blue"
              onClick={() => setTesting(true)}
              disabled={saving}
            >
              <PhoneCall size={16} /> Test call
            </Button>
          )}
          {!isNew && (
            <Button
              variant="secondary"
              className="btn-blue"
              onClick={() => setViewingTestCalls(true)}
              disabled={saving}
            >
              <History size={16} aria-hidden /> Test call history
            </Button>
          )}
          {!isNew && (
            <Button className="btn-red" onClick={handleDelete} disabled={saving}>
              <Trash2 size={16} aria-hidden /> Delete
            </Button>
          )}
        </div>
      </div>

      {testing && agent && (
        <TestCallDrawer agentId={agent.id} onClose={() => setTesting(false)} />
      )}
      {viewingTestCalls && agent && (
        <AgentTestCallsDrawer agentId={agent.id} onClose={() => setViewingTestCalls(false)} />
      )}

      {showRestored && dirty && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2 text-sm text-heading bg-blue-100 dark:bg-primary-soft">
          <span>
            Restored your unsaved {isNew ? "draft" : "changes"}
            {restored?.savedAt
              ? ` from ${formatDate(new Date(restored.savedAt).toISOString())}`
              : ""}
            .
          </span>
          <button
            type="button"
            aria-label="Dismiss"
            className="text-muted hover:text-heading"
            onClick={() => setShowRestored(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6">
      <div
        role="tablist"
        aria-label="Agent setup steps"
        className="flex w-full gap-1 overflow-x-auto border-b border-hairline"
      >
        {TABS.map((tab, i) => {
          const done = tabDone(tab.id);
          const active = i === tabIndex;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => goTo(tab.id)}
            className={clsx(
              "-mb-px flex items-center gap-2 whitespace-nowrap border-b-3  px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-[var(--tab-border-active)] text-[var(--tab-border-active)]"
                : "border-transparent text-muted hover:text-heading",
            )}
            >
              <span
                className={clsx(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  done || active
                    ? "bg-primary text-primary-foreground"
                    : "bg-[var(--fields-input)] text-primary",
                )}
              >
                {done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              {tab.label}
              {OPTIONAL_TABS.includes(tab.id) && (
                <span className="text-xs font-normal text-faint">optional</span>
              )}
            </button>
          );
        })}
      </div>
      </div>

      {/* Panel */}
      <div className="blue-fields mt-6 rounded-lg border border-hairline bg-surface p-5 sm:p-6">
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>

        {activeTab.id === "details" && (
          <AgentDetailsTab
            draft={draft}
            setDraft={setDraft}
            isNew={isNew}
            modelOptions={modelOptions}
          />
        )}
        {activeTab.id === "voice" && (
          <VoicePicker
            value={draft.voice}
            onChange={(voice) => setDraft((d) => ({ ...d, voice }))}
            agentId={initialAgent?.id}
            greeting={draft.greeting}
            language={draft.primaryLanguage}
            onEditGreeting={() => goTo("details")}
          />
        )}

        {/* One Prompt tab with nested sub-tabs: Intro, Rules, Knowledge, Ending, Extra notes */}
        {activeTab.id === "prompt" && (
          <AgentPromptTab
            draft={draft}
            agent={agent}
            promptPart={promptPart}
            setPromptPart={setPromptPart}
            setPart={setPart}
          />
        )}
        {activeTab.id === "whatsapp" && (
          <FeatureAccessGate feature="whatsapp">
            <div className="max-w-xl space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-heading">
                  WhatsApp messages{" "}
                  <span className="text-sm font-normal text-faint">optional</span>
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  The agent can send these template messages to the lead on
                  WhatsApp during or after the call.
                </p>
              </div>
              <WhatsAppMessagesField
                value={draft.whatsappMessageIds}
                onChange={(ids) =>
                  setDraft((d) => ({ ...d, whatsappMessageIds: ids }))
                }
              />
            </div>
          </FeatureAccessGate>
        )}

        {activeTab.id === "classifications" && (
          <ClassificationsStep
            agentId={agentId}
            items={draft.classifications}
            onChange={(classifications) =>
              setDraft((d) => ({ ...d, classifications }))
            }
          />
        )}

        {activeTab.id === "review" && (
          <AgentReview draft={draft} missing={missing} onEdit={goTo} />
        )}

        <div className="-mx-5 -mb-5 mt-6 flex flex-col gap-3 rounded-b-lg border-t border-[#dfe4ef] bg-white px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button
            type="button"
            onClick={() => goTo(TABS[Math.max(0, tabIndex - 1)].id)}
            disabled={tabIndex === 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cfd6e6] bg-white px-4 text-sm font-semibold text-[#141b2d] transition-colors hover:bg-[#f8f9fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <ArrowLeft size={16} strokeWidth={2.2} /> Back
          </button>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            {!isNew && activeTab.id !== "review" && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!dirty || saving}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cfd6e6] bg-white px-4 text-sm font-semibold text-[#141b2d] transition-colors hover:bg-[#f8f9fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-[#dfe4ef] disabled:bg-[#f1f3f8] disabled:text-[#7d879c] disabled:hover:bg-[#f1f3f8] sm:w-auto"
              >
                <Save size={16} strokeWidth={2.2} />
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
            {activeTab.id === "review" && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || missing.length > 0 || (!isNew && !dirty)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cfd6e6] bg-white px-4 text-sm font-semibold text-[#141b2d] transition-colors hover:bg-[#f8f9fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Save size={16} strokeWidth={2.2} />
                {saving ? "Saving…" : isNew ? "Create agent" : "Save changes"}
              </button>
            )}
            <button
              type="button"
              onClick={() => goTo(TABS[Math.min(TABS.length - 1, tabIndex + 1)].id)}
              disabled={tabIndex === TABS.length - 1}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-[#2f5bea] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2449c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Next <ArrowRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraftStatus({
  dirty,
  storageOk,
}: {
  dirty: boolean;
  storageOk: boolean;
}) {
  if (!dirty) return null;
  if (!storageOk) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-warn">
        <CircleAlert size={14} /> Too large to save in this browser
      </span>
    );
  }

}

