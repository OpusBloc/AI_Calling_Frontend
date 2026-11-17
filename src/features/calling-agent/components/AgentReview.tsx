"use client";

import { FileText } from "lucide-react";

import type { AgentDraft } from "@/lib/agentDraft";
import { AGENT_PARTS, type AgentPart } from "@/lib/callingAgentApi";
import { PART_META, languageList } from "./agentEditorConstants";
/* --------------------------------- Review --------------------------------- */

export default function AgentReview({
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
      tab: "details",
      label: "Second Line — Yes",
      value: draft.secondLineYes.trim() || "Not set",
      required: false,
    },
    {
      tab: "details",
      label: "Second Line — No",
      value: draft.secondLineNo.trim() || "Not set",
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
        <p className="rounded-md border border-[var(--info-border)] bg-[var(--info-surface)] px-3 py-2 text-sm text-[var(--info-text)]">
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
                className="text-sm font-medium text-link hover:underline"
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
