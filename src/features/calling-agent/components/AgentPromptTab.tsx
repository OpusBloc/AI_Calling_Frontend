"use client";

import type { Agent } from "@/lib/callingAgentApi";
import { AGENT_PARTS, type AgentPart } from "@/lib/callingAgentApi";
import type { AgentDraft, PartDraft } from "@/lib/agentDraft";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  const promptIndex = AGENT_PARTS.indexOf(promptPart);
  const goToPromptIndex = (index: number) => {
    const boundedIndex = Math.max(0, Math.min(AGENT_PARTS.length - 1, index));
    setPromptPart(AGENT_PARTS[boundedIndex]);
  };

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-xl font-semibold text-heading">Prompt</h2>
        <p className=" text-sm text-muted">
          Everything that makes up the system prompt. Pick a section below to edit it.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#dfe4ef] bg-white">
        <nav
          aria-label="Prompt section navigation"
          className="grid grid-cols-2 items-center gap-x-3 gap-y-3 border-b border-[#e6eaf3] bg-[#fafbfe] px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-3 sm:px-6 sm:py-3.5"
        >
          <div className="col-span-2 order-first flex flex-col items-center gap-1.5 sm:order-none sm:col-span-1 sm:col-start-2 sm:row-start-1">
            <div className="flex items-center gap-1.5" aria-label="Prompt progress">
              {AGENT_PARTS.map((part, index) => {
                const current = index === promptIndex;
                const completed = index <= promptIndex;
                return (
                  <button
                    key={part}
                    type="button"
                    aria-label={`Go to section ${index + 1}`}
                    aria-current={current ? "step" : undefined}
                    onClick={() => goToPromptIndex(index)}
                    className={`h-1.5 w-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea] focus-visible:ring-offset-2 ${completed ? "bg-[#2f5bea]" : "bg-[#dfe4ef]"}`}
                  />
                );
              })}
            </div>
            <span className="text-xs font-medium text-[#566079]" aria-live="polite">
              Prompt section {promptIndex + 1} of {AGENT_PARTS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => goToPromptIndex(promptIndex - 1)}
            disabled={promptIndex === 0}
            className="order-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] px-2 text-sm font-semibold text-[#2f5bea] transition-colors hover:bg-[#eef2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-[#7d879c] disabled:hover:bg-transparent sm:order-none sm:col-start-1 sm:row-start-1 sm:w-fit sm:justify-self-start sm:px-3.5"
          >
            <ArrowLeft size={16} strokeWidth={2.2} /> Previous section
          </button>

          <button
            type="button"
            onClick={() => goToPromptIndex(promptIndex + 1)}
            disabled={promptIndex === AGENT_PARTS.length - 1}
            className="order-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] px-2 text-sm font-semibold text-[#2f5bea] transition-colors hover:bg-[#eef2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5bea] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-[#7d879c] disabled:hover:bg-transparent sm:order-none sm:col-start-3 sm:row-start-1 sm:w-fit sm:justify-self-end sm:px-3.5"
          >
            Next section <ArrowRight size={16} strokeWidth={2.2} />
          </button>
        </nav>

        <div className="p-5 sm:p-6">
          <AgentPartEditor
            key={promptPart}
            part={promptPart}
            value={draft.parts[promptPart]}
            savedText={agent ? (agent[promptPart] ?? "") : null}
            onChange={(value) => setPart(promptPart, value)}
          />
        </div>
      </section>
    </div>
  );
}
