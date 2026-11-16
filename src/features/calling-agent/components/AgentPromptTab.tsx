"use client";

import type { Agent } from "@/lib/callingAgentApi";
import { AGENT_PARTS, type AgentPart } from "@/lib/callingAgentApi";
import { isPartFilled, type AgentDraft, type PartDraft } from "@/lib/agentDraft";
import { Check } from "lucide-react";
import clsx from "clsx";
import { PART_META } from "./agentEditorConstants";
import AgentPartEditor from "./AgentPartEditor";

export default function AgentPromptTab({
  draft,
  agent,
  promptPart,
  setPromptPart,
  setPart,
}: {
  draft: AgentDraft;
  agent: Agent | null;
  promptPart: AgentPart;
  setPromptPart: (part: AgentPart) => void;
  setPart: (part: AgentPart, value: PartDraft) => void;
}) {
  return (<div className="space-y-5">
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

  <AgentPartEditor
    key={promptPart}
    part={promptPart}
    value={draft.parts[promptPart]}
    savedText={agent ? (agent[promptPart] ?? "") : null}
    onChange={(v) => setPart(promptPart, v)}
  />
</div>
  );
}
