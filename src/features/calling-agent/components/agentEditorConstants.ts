import type { AgentDraft } from "@/lib/agentDraft";
import type { AgentPart } from "@/lib/callingAgentApi";
import { AGENT_LANGUAGES } from "@/lib/callingAgentApi";

export const PART_META: Record<
  AgentPart,
  { label: string; description: string; placeholder: string }
> = {
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

export const languageList = (draft: AgentDraft) =>
  [draft.primaryLanguage, draft.secondaryLanguage]
    .filter(Boolean)
    .map((code) => AGENT_LANGUAGES[code] ?? code)
    .join(" and ");
