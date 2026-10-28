"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  PenLine,
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
import { AGENT_PARTS, Agent, AgentPart, createAgent, deleteAgent, updateAgent } from "@/lib/callingAgentApi";
import { showErrorNotification, showSuccessNotification } from "@/hooks/useNotification";
import { Button, ErrorBanner, Field, TextArea, TextInput, errorMessage, formatDate } from "./ui";

const PART_META: Record<AgentPart, { label: string; description: string; placeholder: string }> = {
  intro: {
    label: "Intro",
    description: "Persona and call script. This goes at the top of the system prompt.",
    placeholder: "You are Poonam, a warm and confident calling assistant for Opus Bloc…",
  },
  rules: {
    label: "Rules",
    description: "How the agent should talk and the flow the call should follow.",
    placeholder: "- Keep every reply under two sentences.\n- Ask one question at a time.",
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
    description: "Optional. Anything else, added to the prompt as “Additional notes”.",
    placeholder: "Anything the other sections don't cover…",
  },
};

const TABS = [
  { id: "details", label: "Details" },
  ...AGENT_PARTS.map((p) => ({ id: p, label: PART_META[p].label })),
  { id: "review", label: "Review" },
];

const comparable = (d: AgentDraft) => JSON.stringify({ name: d.name, greeting: d.greeting, parts: d.parts });

export default function AgentEditor({ agent: initialAgent }: { agent: Agent | null }) {
  const router = useRouter();
  const agentId = initialAgent?.id ?? null;
  const isNew = agentId === null;

  const [agent, setAgent] = useState(initialAgent);
  const baseline = useMemo(() => (agent ? draftFromAgent(agent) : emptyDraft()), [agent]);

  // Restore an unsaved local draft if there is one
  const [restored] = useState(() => loadDraft(agentId));
  const [draft, setDraft] = useState<AgentDraft>(() => restored ?? baseline);
  const [showRestored, setShowRestored] = useState(!!restored);
  const [storageOk, setStorageOk] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const tabIndex = Math.max(0, TABS.findIndex((t) => t.id === draft.tab));
  const goTo = (tab: string) => setDraft((d) => ({ ...d, tab }));
  const setPart = (part: AgentPart, value: PartDraft) =>
    setDraft((d) => ({ ...d, parts: { ...d.parts, [part]: value } }));

  const tabDone = (id: string) =>
    id === "details" ? !!draft.name.trim() : id === "review" ? false : isPartFilled(draft.parts[id as AgentPart]);

  const handleDiscard = () => {
    const message = isNew ? "Discard this draft and start over?" : "Discard your unsaved changes?";
    if (!window.confirm(message)) return;
    clearDraft(agentId);
    setDraft({ ...baseline, tab: draft.tab });
    setShowRestored(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (missing.length) {
      goTo(missing[0]);
      setError("Fill in every required section before saving.");
      showErrorNotification("Fill in every required section before saving.", { title: "Agent not saved" });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const created = await createAgent(toCreateForm(draft));
        clearDraft(null);
        showSuccessNotification(`"${created.name}" was created.`, { title: "Agent created" });
        router.replace(`/calling-agent/agents/${created.id}`);
        return;
      }
      const form = toUpdateForm(draft, agent!);
      const updated = form ? await updateAgent(agent!.id, form) : agent!;
      clearDraft(agentId);
      setAgent(updated);
      setDraft({ ...draftFromAgent(updated), tab: draft.tab });
      setShowRestored(false);
      showSuccessNotification(form ? `"${updated.name}" was updated.` : "There were no changes to save.", {
        title: form ? "Agent saved" : "Nothing to save",
      });
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
    if (!agent || !window.confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteAgent(agent.id);
      clearDraft(agentId);
      showSuccessNotification(`"${agent.name}" was deleted.`, { title: "Agent deleted" });
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
      <Link
        href="/calling-agent?tab=agents"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-heading"
      >
        <ArrowLeft size={16} /> Agents
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">
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
            <Button variant="secondary" onClick={handleDelete} disabled={saving} className="text-loss">
              <Trash2 size={16} /> Delete
            </Button>
          )}
        </div>
      </div>

      {showRestored && dirty && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-hairline bg-accent-bg px-3 py-2 text-sm text-heading">
          <span>
            Restored your unsaved {isNew ? "draft" : "changes"}
            {restored?.savedAt ? ` from ${formatDate(new Date(restored.savedAt).toISOString())}` : ""}.
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
      <div role="tablist" className="mt-6 flex gap-1 overflow-x-auto border-b border-hairline">
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
                active ? "border-accent text-accent-text" : "border-transparent text-muted hover:text-heading",
              )}
            >
              <span
                className={clsx(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  done ? "bg-gain-bg text-gain" : active ? "bg-accent text-on-accent" : "bg-chip text-muted",
                )}
              >
                {done ? <Check size={12} strokeWidth={3} /> : i + 1}
              </span>
              {tab.label}
              {tab.id === "extra" && <span className="text-xs font-normal text-faint">optional</span>}
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
          <div className="max-w-xl space-y-4">
            <Field label="Name">
              <TextInput
                value={draft.name}
                maxLength={255}
                autoFocus={isNew}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Poonam"
              />
            </Field>
            <Field label="Greeting" hint="Optional. The first sentence spoken on the call; a default is used when empty.">
              <TextInput
                value={draft.greeting}
                onChange={(e) => setDraft((d) => ({ ...d, greeting: e.target.value }))}
                placeholder="Hello, this is Poonam from Opus Bloc."
              />
            </Field>
          </div>
        )}

        {(AGENT_PARTS as readonly string[]).includes(activeTab.id) && (
          <PartEditor
            key={activeTab.id}
            part={activeTab.id as AgentPart}
            value={draft.parts[activeTab.id as AgentPart]}
            savedText={agent ? (agent[activeTab.id as AgentPart] ?? "") : null}
            onChange={(v) => setPart(activeTab.id as AgentPart, v)}
          />
        )}

        {activeTab.id === "review" && <Review draft={draft} missing={missing} onEdit={goTo} />}

        {/* Footer navigation */}
        <div className="mt-6 flex items-center justify-between border-t border-hairline pt-4">
          <Button variant="secondary" onClick={() => goTo(TABS[tabIndex - 1].id)} disabled={tabIndex === 0}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div className="flex gap-2">
            {!isNew && activeTab.id !== "review" && (
              <Button variant="secondary" onClick={handleSubmit} disabled={!dirty || saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            )}
            {activeTab.id === "review" ? (
              <Button onClick={handleSubmit} disabled={saving || missing.length > 0 || (!isNew && !dirty)}>
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

function DraftStatus({ dirty, storageOk }: { dirty: boolean; storageOk: boolean }) {
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

  const switchMode = (next: "text" | "file") => {
    if (next === mode) return;
    setFileError(null);
    if (next === "text") {
      // Keep a loaded file's contents so it can be edited as text
      onChange({ source: "text", text: value.text });
    } else {
      if (value.text.trim() && !window.confirm("Replace the typed text with an uploaded file?")) return;
      onChange({ source: "file", text: "" });
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileError(null);
    try {
      onChange({ source: "file", text: await readTextFile(file), fileName: file.name });
    } catch (err) {
      setFileError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-heading">
            {meta.label}
            {part === "extra" && <span className="ml-2 text-sm font-normal text-faint">optional</span>}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{meta.description}</p>
        </div>

        <div className="inline-flex rounded-md border border-hairline bg-surface-input p-0.5">
          {(
            [
              ["text", "Write text", PenLine],
              ["file", "Upload file", Upload],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => switchMode(id)}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                mode === id ? "bg-surface text-heading shadow-sm" : "text-muted hover:text-heading",
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "text" ? (
        <>
          <TextArea
            rows={16}
            value={value.text}
            onChange={(e) => onChange({ source: "text", text: e.target.value })}
            placeholder={meta.placeholder}
            className="font-mono text-[13px]"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>
              Wrap key points in <code className="rounded bg-chip px-1">**double asterisks**</code> to make
              them stand out in the prompt.
            </span>
            <span className="tnum">{value.text.length.toLocaleString()} chars</span>
          </div>
        </>
      ) : hasFile ? (
        <div className="rounded-md border border-hairline">
          <div className="flex items-center justify-between gap-3 border-b border-hairline bg-raised px-3 py-2">
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-heading">
              <FileText size={16} className="shrink-0 text-accent-text" />
              <span className="truncate">{value.fileName}</span>
              <span className="tnum shrink-0 text-xs font-normal text-muted">
                {value.text.length.toLocaleString()} chars
              </span>
            </span>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button variant="ghost" onClick={() => onChange({ source: "file", text: "" })}>
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
            "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-14 text-center transition-colors",
            dragging ? "border-accent bg-accent-bg" : "border-hairline-strong hover:bg-surface-hover",
          )}
        >
          <Upload size={22} className="text-muted" />
          <span className="text-sm font-medium text-heading">Drop a file here or click to browse</span>
          <span className="text-xs text-muted">.txt or .md, UTF-8, up to 1 MB</span>
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
  const rows: { tab: string; label: string; value: string; detail?: string; required: boolean }[] = [
    { tab: "details", label: "Name", value: draft.name.trim(), required: true },
    { tab: "details", label: "Greeting", value: draft.greeting.trim() || "Default greeting", required: false },
    ...AGENT_PARTS.map((p) => {
      const part = draft.parts[p];
      return {
        tab: p,
        label: PART_META[p].label,
        value: part.text.trim(),
        detail: part.source === "file" && part.fileName ? part.fileName : undefined,
        required: p !== "extra",
      };
    }),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-heading">Review</h2>
        <p className="mt-0.5 text-sm text-muted">Check everything before saving to the backend.</p>
      </div>

      {missing.length > 0 && (
        <p className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">
          Still needed: {missing.map((m) => (m === "details" ? "Name" : PART_META[m as AgentPart].label)).join(", ")}
        </p>
      )}

      <dl className="divide-y divide-hairline rounded-md border border-hairline">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[140px_1fr_auto] sm:gap-4">
            <dt className="text-sm font-medium text-heading">{row.label}</dt>
            <dd className="min-w-0 text-sm">
              {row.value ? (
                <>
                  {row.detail && (
                    <span className="mb-0.5 flex items-center gap-1 text-xs text-muted">
                      <FileText size={12} /> {row.detail}
                    </span>
                  )}
                  <span className="line-clamp-2 whitespace-pre-line text-body">{row.value}</span>
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
