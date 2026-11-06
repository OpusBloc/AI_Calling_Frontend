"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  PenLine,
  PhoneCall,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  AgentDraft,
  PartDraft,
  UPLOAD_EXTENSIONS,
  clearDraft,
  draftFromAgent,
  emptyDraft,
  isPartFilled,
  loadDraft,
  missingRequired,
  readTextFile,
  saveDraft,
  toCreateForm,
  toUpdateForm,
} from "@/lib/agentDraft";
import {
  AGENT_LANGUAGES,
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
import {
  Button,
  PageTopBar,
  ErrorBanner,
  Field,
  Select,
  TextArea,
  TextInput,
  errorMessage,
  formatDate,
} from "@/components/ui";
import TestCallDrawer from "./TestCallDrawer";
import VoicePicker from "./VoicePicker";
import ClassificationsStep from "./ClassificationsStep";
import WhatsAppMessagesField from "./WhatsAppMessagesField";

const PART_META: Record<
  AgentPart,
  { label: string; description: string; placeholder: string }
> = {
  intro: {
    label: "Intro",
    description:
      "Persona and call script. This goes at the top of the system prompt.",
    placeholder:
      "You are Poonam, a warm and confident calling assistant for Opus Bloc…",
  },
  rules: {
    label: "Rules",
    description:
      "How the agent should talk and the flow the call should follow.",
    placeholder:
      "- Keep every reply under two sentences.\n- Ask one question at a time.",
  },
  knowledge: {
    label: "Knowledge",
    description: "Approved facts the agent is allowed to state.",
    placeholder: "- Office hours are 10am to 6pm, Monday to Saturday.",
  },
  ending: {
    label: "Ending",
    description: "When the agent should end the call and how to say goodbye.",
    placeholder: "End the call when the customer says no twice…",
  },
  extra: {
    label: "Extra notes",
    description:
      "Optional. Anything else, added to the prompt as “Additional notes”.",
    placeholder: "Anything the other sections don't cover…",
  },
};

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
      router.replace("/calling-agent?tab=agents");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const activeTab = TABS[tabIndex];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <PageTopBar
        breadcrumbs={[
          { label: "Calling Agent", href: "/calling-agent?tab=agents" },
          { label: isNew ? "New agent" : agent!.name },
        ]}
      />

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
            <Button variant="ghost" onClick={handleDiscard} disabled={saving}>
              {isNew ? "Discard draft" : "Discard changes"}
            </Button>
          )}
          {!isNew && (
            <Button
              variant="secondary"
              onClick={() => setTesting(true)}
              disabled={saving}
            >
              <PhoneCall size={16} /> Test call
            </Button>
          )}
          {!isNew && (
            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={saving}
              className="text-loss hover:bg-loss-bg"
            >
              <Trash2 size={16} /> Delete
            </Button>
          )}
        </div>
      </div>

      {testing && agent && (
        <TestCallDrawer agentId={agent.id} onClose={() => setTesting(false)} />
      )}

      {showRestored && dirty && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-hairline bg-accent-bg px-3 py-2 text-sm text-heading">
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
      <div
        role="tablist"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-hairline"
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
                "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-accent text-accent-text"
                  : "border-transparent text-muted hover:text-heading",
              )}
            >
              <span
                className={clsx(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  done
                    ? "bg-gain-bg text-gain"
                    : active
                      ? "bg-accent text-on-accent"
                      : "bg-chip text-muted",
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

      {/* Panel */}
      <div className="mt-6 rounded-lg border border-hairline bg-surface p-5 sm:p-6">
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>

        {activeTab.id === "details" && (
          <div className="max-w-xl space-y-6">
            <div className="space-y-4">
              <Field label="Name">
                <TextInput
                  value={draft.name}
                  maxLength={255}
                  autoFocus={isNew}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="e.g. Poonam"
                />
              </Field>
              <Field
                label="Greeting"
                hint={
                  <>
                    Optional. The first sentence spoken on the call; a default
                    is used when empty. Type{" "}
                    <code className="tnum">{"{{name}}"}</code> to say the
                    lead&apos;s name — if a lead has no name, that sentence is
                    skipped.
                  </>
                }
              >
                <TextInput
                  value={draft.greeting}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, greeting: e.target.value }))
                  }
                  placeholder="Hello, this is Poonam from Opus Bloc. Am I speaking with {{name}}?"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Main language"
                  hint="The agent starts every call in this language."
                >
                  <Select
                    value={draft.primaryLanguage}
                    onChange={(e) => {
                      const primaryLanguage = e.target.value;
                      setDraft((d) => ({
                        ...d,
                        primaryLanguage,
                        // A second language needs a main one, and can't be the same
                        secondaryLanguage:
                          !primaryLanguage ||
                          d.secondaryLanguage === primaryLanguage
                            ? ""
                            : d.secondaryLanguage,
                      }));
                    }}
                  >
                    <option value="">System default</option>
                    {Object.entries(AGENT_LANGUAGES).map(([code, label]) => (
                      <option key={code} value={code}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Second language"
                  hint={
                    draft.primaryLanguage
                      ? "Optional. Used only if the caller speaks it."
                      : "Pick a main language first."
                  }
                >
                  <Select
                    value={draft.secondaryLanguage}
                    disabled={!draft.primaryLanguage}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        secondaryLanguage: e.target.value,
                      }))
                    }
                  >
                    <option value="">None</option>
                    {Object.entries(AGENT_LANGUAGES)
                      .filter(([code]) => code !== draft.primaryLanguage)
                      .map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>
              {draft.primaryLanguage && (
                <p className="-mt-1 text-xs text-muted">
                  The agent speaks only {languageList(draft)}. If a caller uses
                  another language, it politely says so and carries on in these.
                </p>
              )}
            </div>

            <div className="space-y-4 border-t border-hairline pt-5">
              <div>
                <h3 className="text-sm font-semibold text-heading">AI Model Settings</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Choose the language model and speech-to-text provider and model. Sarvam is selected by default.
                </p>
              </div>
              {modelOptions.isError ? (
                <ErrorBanner message={errorMessage(modelOptions.error)} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-4">
                    <Field label="LLM model provider">
                      <Select
                        value={draft.llmProvider}
                        disabled={!modelOptions.data}
                        onChange={(e) => {
                          const llmProvider = e.target.value;
                          setDraft((d) => ({
                            ...d,
                            llmProvider,
                            llmModel: modelOptions.data?.llm_model[llmProvider]?.[0] ?? "",
                          }));
                        }}
                      >
                        {(modelOptions.data?.llm_provider ?? []).map((provider) => (
                          <option key={provider} value={provider}>{provider}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="LLM model" hint="The selected provider's first available model is selected by default.">
                      <Select
                        value={draft.llmModel}
                        disabled={!draft.llmProvider || !modelOptions.data}
                        onChange={(e) => setDraft((d) => ({ ...d, llmModel: e.target.value }))}
                      >
                        {draft.llmModel &&
                          !(modelOptions.data?.llm_model[draft.llmProvider] ?? []).includes(draft.llmModel) && (
                            <option value={draft.llmModel}>{draft.llmModel}</option>
                          )}
                        {(modelOptions.data?.llm_model[draft.llmProvider] ?? []).map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <div className="space-y-4">
                    <Field label="Speech-to-text provider">
                      <Select
                        value={draft.sttProvider}
                        disabled={!modelOptions.data}
                        onChange={(e) => {
                          const sttProvider = e.target.value;
                          setDraft((d) => ({
                            ...d,
                            sttProvider,
                            sttModel: modelOptions.data?.stt_model[sttProvider]?.[0] ?? "",
                          }));
                        }}
                      >
                        {(modelOptions.data?.stt_provider ?? []).map((provider) => (
                          <option key={provider} value={provider}>{provider}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Speech-to-text model" hint="The selected provider's first available model is selected by default.">
                      <Select
                        value={draft.sttModel}
                        disabled={!draft.sttProvider || !modelOptions.data}
                        onChange={(e) => setDraft((d) => ({ ...d, sttModel: e.target.value }))}
                      >
                        {draft.sttModel &&
                          !(modelOptions.data?.stt_model[draft.sttProvider] ?? []).includes(draft.sttModel) && (
                            <option value={draft.sttModel}>{draft.sttModel}</option>
                          )}
                        {(modelOptions.data?.stt_model[draft.sttProvider] ?? []).map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {/* Silence Settings Section */}
            <div className="border-t border-hairline pt-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-heading">
                  Silence Settings
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Control how the agent responds and when calls hang up when the
                  caller is quiet.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Interruption Minimum Words"
                 hint="Whole numbers only. 0 prevents interruptions; empty uses the system default."
                >
                  <TextInput
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={
                      draft.interruptionMinWords !== null
                        ? String(draft.interruptionMinWords)
                        : ""
                    }
                    onKeyDown={(e) => {
                      // type="number" allows these by default; block them
                      if (["e", "E", "+", "-", "."].includes(e.key))
                        e.preventDefault();
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      // only allow empty or digits
                      if (val !== "" && !/^\d+$/.test(val)) return;
                      setDraft((d) => ({
                        ...d,
                        interruptionMinWords:
                          val === "" ? null : parseInt(val, 10),
                      }));
                    }}
                    placeholder="System default"
                  />
                </Field>
                <Field
                  label="Silence Check Seconds"
                  hint="Seconds of silence before agent prompts caller."
                >
                  <TextInput
                    type="number"
                    min={1}
                    max={300}
                    value={
                      draft.silenceCheckSeconds !== null
                        ? String(draft.silenceCheckSeconds)
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraft((d) => ({
                        ...d,
                        silenceCheckSeconds: val === "" ? null : Number(val),
                      }));
                    }}
                    placeholder="e.g. 5"
                  />
                </Field>

                <Field
                  label="Silence Hangup Seconds"
                  hint="Seconds of silence before hanging up the call."
                >
                  <TextInput
                    type="number"
                    min={1}
                    max={600}
                    value={
                      draft.silenceHangupSeconds !== null
                        ? String(draft.silenceHangupSeconds)
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraft((d) => ({
                        ...d,
                        silenceHangupSeconds: val === "" ? null : Number(val),
                      }));
                    }}
                    placeholder="e.g. 15"
                  />
                </Field>
              </div>

              <Field
                label="Silence Prompt"
                hint="Spoken by agent when caller is silent for the check duration."
              >
                <TextArea
                  rows={2}
                  value={draft.silencePrompt}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, silencePrompt: e.target.value }))
                  }
                  placeholder="e.g. Hello, are you still there? Please let me know how I can help."
                />
              </Field>
            </div>
          </div>
        )}

        {activeTab.id === "voice" && (
          <VoicePicker
            value={draft.voice}
            onChange={(voice) => setDraft((d) => ({ ...d, voice }))}
            greeting={draft.greeting}
            language={draft.primaryLanguage}
            onEditGreeting={() => goTo("details")}
          />
        )}

        {/* One Prompt tab with nested sub-tabs: Intro, Rules, Knowledge, Ending, Extra notes */}
        {activeTab.id === "prompt" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-heading">Prompt</h2>
              <p className="mt-0.5 text-sm text-muted">
                Everything that makes up the system prompt. Pick a section below
                to edit it.
              </p>
            </div>

            <div
              role="tablist"
              className="flex gap-1 overflow-x-auto rounded-md bg-chip p-1"
            >
              {AGENT_PARTS.map((part) => {
                const active = part === promptPart;
                const filled = isPartFilled(draft.parts[part]);
                return (
                  <button
                    key={part}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPromptPart(part)}
                    className={clsx(
                      "flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-surface text-heading shadow-xs"
                        : "text-muted hover:text-heading",
                    )}
                  >
                    {filled && (
                      <Check size={13} strokeWidth={3} className="text-gain" />
                    )}
                    {PART_META[part].label}
                    {part === "extra" && (
                      <span className="text-xs font-normal text-faint">
                        optional
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <PartEditor
              key={promptPart}
              part={promptPart}
              value={draft.parts[promptPart]}
              savedText={agent ? (agent[promptPart] ?? "") : null}
              onChange={(v) => setPart(promptPart, v)}
            />
          </div>
        )}

        {activeTab.id === "whatsapp" && (
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
          <Review draft={draft} missing={missing} onEdit={goTo} />
        )}

        {/* Footer navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
          <Button
            variant="secondary"
            onClick={() => goTo(TABS[tabIndex - 1].id)}
            disabled={tabIndex === 0}
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <div className="flex gap-2">
            {!isNew && activeTab.id !== "review" && (
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={!dirty || saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            )}
            {activeTab.id === "review" ? (
              <Button
                onClick={handleSubmit}
                disabled={saving || missing.length > 0 || (!isNew && !dirty)}
              >
                {saving ? "Saving…" : isNew ? "Create agent" : "Save changes"}
              </Button>
            ) : (
              <Button onClick={() => goTo(TABS[tabIndex + 1].id)}>
                Next <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const languageList = (d: AgentDraft) =>
  [d.primaryLanguage, d.secondaryLanguage]
    .filter(Boolean)
    .map((code) => AGENT_LANGUAGES[code] ?? code)
    .join(" and ");

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
  return <span className="text-xs text-muted">Draft saved locally</span>;
}

/* ------------------------------- Part editor ------------------------------ */

function PartEditor({
  part,
  value,
  savedText,
  onChange,
}: {
  part: AgentPart;
  value: PartDraft;
  savedText: string | null;
  onChange: (value: PartDraft) => void;
}) {
  const meta = PART_META[part];
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const mode = value.source;
  const hasFile = mode === "file" && !!value.fileName;

  const switchMode = async (next: "text" | "file") => {
    if (next === mode) return;
    setFileError(null);
    if (next === "text") {
      // Keep a loaded file's contents so it can be edited as text
      onChange({ source: "text", text: value.text });
    } else {
      // Switched to upload; clear text if it wasn't from a file
      onChange({ source: "file", text: "" });
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileError(null);
    try {
      const text = await readTextFile(file);
      onChange({ source: "file", text, fileName: file.name });
    } catch (err) {
      setFileError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-heading">
            {meta.label}{" "}
            {part === "extra" && (
              <span className="text-sm font-normal text-faint">optional</span>
            )}
          </h3>
          <p className="mt-0.5 text-sm text-muted">{meta.description}</p>
        </div>
        <div className="inline-flex rounded-md border border-hairline bg-surface p-0.5 text-xs">
          <button
            type="button"
            onClick={() => switchMode("text")}
            className={clsx(
              "flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors",
              mode === "text"
                ? "bg-accent text-on-accent shadow-xs"
                : "text-muted hover:text-heading",
            )}
          >
            <PenLine size={13} /> Type text
          </button>
          <button
            type="button"
            onClick={() => switchMode("file")}
            className={clsx(
              "flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors",
              mode === "file"
                ? "bg-accent text-on-accent shadow-xs"
                : "text-muted hover:text-heading",
            )}
          >
            <Upload size={13} /> Upload file
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <TextArea
          rows={14}
          value={value.text}
          onChange={(e) => onChange({ source: "text", text: e.target.value })}
          placeholder={meta.placeholder}
        />
      ) : hasFile ? (
        <div className="rounded-md border border-hairline bg-surface">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-heading">
              <FileText size={14} className="text-accent-text" />{" "}
              {value.fileName}
              <span className="text-muted">
                {value.text.length.toLocaleString()} chars
              </span>
            </span>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button
                variant="ghost"
                onClick={() => onChange({ source: "file", text: "" })}
              >
                Remove
              </Button>
            </div>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[13px] text-body">
            {value.text}
          </pre>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className={clsx(
            "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-accent bg-accent-bg"
              : "border-hairline-strong hover:bg-surface-hover",
          )}
        >
          <Upload size={22} className="text-muted" />
          <span className="text-sm font-medium text-heading">
            Drop a file here or click to browse
          </span>
          <span className="text-xs text-muted">
            .txt or .md, UTF-8, up to 1 MB
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <ErrorBanner message={fileError} />

      {savedText !== null && savedText && !isPartFilled(value) && (
        <p className="text-xs text-warn">
          Left empty, this section keeps its current saved text.
        </p>
      )}
    </div>
  );
}

/* --------------------------------- Review --------------------------------- */

function Review({
  draft,
  missing,
  onEdit,
}: {
  draft: AgentDraft;
  missing: string[];
  onEdit: (tab: string) => void;
}) {
  const rows: {
    tab: string;
    label: string;
    value: string;
    detail?: string;
    required: boolean;
  }[] = [
    { tab: "details", label: "Name", value: draft.name.trim(), required: true },
    {
      tab: "details",
      label: "Greeting",
      value: draft.greeting.trim() || "Default greeting",
      required: false,
    },
    {
      tab: "details",
      label: "Languages",
      value: draft.primaryLanguage ? languageList(draft) : "System default",
      required: false,
    },
    {
      tab: "details",
      label: "Language model",
      value: [draft.llmProvider, draft.llmModel].filter(Boolean).join(" / ") || "System default",
      required: false,
    },
    {
      tab: "details",
      label: "Speech-to-text",
      value: [draft.sttProvider, draft.sttModel].filter(Boolean).join(" / ") || "System default",
      required: false,
    },
    {
      tab: "details",
      label: "Silence Check",
      value:
        draft.silenceCheckSeconds !== null
          ? `${draft.silenceCheckSeconds}s`
          : "Not set",
      required: false,
    },
    {
      tab: "details",
      label: "Silence Hangup",
      value:
        draft.silenceHangupSeconds !== null
          ? `${draft.silenceHangupSeconds}s`
          : "Not set",
      required: false,
    },
    {
      tab: "details",
      label: "Interruption Minimum Words",
      value:
        draft.interruptionMinWords !== null
          ? String(draft.interruptionMinWords)
          : "System default",
      required: false,
    },
    {
      tab: "details",
      label: "Silence Prompt",
      value: draft.silencePrompt.trim() || "Not set",
      required: false,
    },
    {
      tab: "voice",
      label: "Voice",
      value: draft.voice || "Default voice",
      required: false,
    },
    // Each part's Edit button opens the Prompt tab on that part's sub-tab
    ...AGENT_PARTS.map((p) => {
      const part = draft.parts[p];
      return {
        tab: p,
        label: PART_META[p].label,
        value: part.text.trim(),
        detail:
          part.source === "file" && part.fileName ? part.fileName : undefined,
        required: p !== "extra",
      };
    }),
    {
      tab: "whatsapp",
      label: "WhatsApp Messages",
      value:
        draft.whatsappMessageIds.length > 0
          ? `${draft.whatsappMessageIds.length} message template(s) selected`
          : "None selected",
      required: false,
    },
    {
      tab: "classifications",
      label: "Classifications",
      value:
        draft.classifications && draft.classifications.length > 0
          ? `${draft.classifications.length} configured (${draft.classifications.map((c) => c.name).join(", ")})`
          : "None configured (optional)",
      required: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-heading">Review</h2>
        <p className="mt-0.5 text-sm text-muted">
          Check everything before saving to the backend.
        </p>
      </div>

      {missing.length > 0 && (
        <p className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
          Still needed:{" "}
          {missing
            .map((m) =>
              m === "details" ? "Name" : PART_META[m as AgentPart].label,
            )
            .join(", ")}
        </p>
      )}

      <dl className="divide-y divide-hairline rounded-md border border-hairline">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr_auto] sm:gap-4"
          >
            <dt className="text-sm font-medium text-heading">{row.label}</dt>
            <dd className="min-w-0 text-sm">
              {row.value ? (
                <>
                  {row.detail && (
                    <span className="mb-0.5 flex items-center gap-1 text-xs text-muted">
                      <FileText size={12} /> {row.detail}
                    </span>
                  )}
                  <span className="line-clamp-2 whitespace-pre-line text-body">
                    {row.value}
                  </span>
                </>
              ) : (
                <span className={row.required ? "text-loss" : "text-faint"}>
                  {row.required ? "Required" : "Not added"}
                </span>
              )}
            </dd>
            <dd>
              <button
                type="button"
                onClick={() => onEdit(row.tab)}
                className="text-sm font-medium text-accent-text hover:underline"
              >
                Edit
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
