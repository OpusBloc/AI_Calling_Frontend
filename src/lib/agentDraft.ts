// src/lib/agentDraft.ts
import { AGENT_PARTS, Agent, AgentPart } from "@/lib/callingAgentApi";

/**
 * One agent text. A file's contents are read in the browser and kept as text, so
 * the draft survives a refresh; on submit it is re-sent as `<part>_file`.
 */
export interface PartDraft {
  source: "text" | "file";
  text: string;
  fileName?: string;
}

export interface ClassificationDraftItem {
  id: string;
  name: string;
  description: string;
}

export interface AgentDraft {
  name: string;
  greeting: string;
  /** Stock voice id; empty = system default */
  voice: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  llmProvider: string;
  llmModel: string;
  sttProvider: string;
  sttModel: string;
  silenceCheckSeconds: number | null;
  silencePrompt: string;
  silenceHangupSeconds: number | null;
  interruptionMinWords: number | null;
  whatsappMessageIds: string[];
  parts: Record<AgentPart, PartDraft>;
  classifications: ClassificationDraftItem[];
  tab: string;
  savedAt?: number;
}

export interface CampaignDraft {
  name: string;
  calling_agent: string;
  status: string;
  plivo_pools: string;
  call_transfor_agents: string;
  transfer_ring_time: string;
  start_at: string;
  end_at: string;
  calling_houe_start: string;
  calling_hour_end: string;
  call_days: string;
  parallel_calls: string;
  max_live_calls: string;
  new_calls_per_sceond: string;
  retry_attempts: string;
  min_between_retires: string;
  retry_when_call_is: string;
}

export const UPLOAD_EXTENSIONS = [".txt", ".md"];
export const UPLOAD_MAX_BYTES = 1_000_000;

const blankPart = (): PartDraft => ({ source: "text", text: "" });

export const emptyDraft = (): AgentDraft => ({
  name: "",
  greeting: "",
  voice: "",
  primaryLanguage: "",
  secondaryLanguage: "",
  llmProvider: "sarvam",
  llmModel: "",
  sttProvider: "sarvam",
  sttModel: "",
  silenceCheckSeconds: null,
  silencePrompt: "",
  silenceHangupSeconds: null,
  interruptionMinWords: null,
  whatsappMessageIds: [],
  parts: Object.fromEntries(
    AGENT_PARTS.map((p) => [p, blankPart()]),
  ) as AgentDraft["parts"],
  classifications: [],
  tab: "details",
});

export const draftFromAgent = (agent: Agent): AgentDraft => ({
  name: agent.name,
  greeting: agent.greeting ?? "",
  voice: agent.voice ?? "",
  primaryLanguage: agent.primary_language ?? "",
  secondaryLanguage: agent.secondary_language ?? "",
  llmProvider: agent.llm_provider ?? "sarvam",
  llmModel: agent.llm_model ?? "",
  sttProvider: agent.stt_provider ?? "sarvam",
  sttModel: agent.stt_model ?? "",
  silenceCheckSeconds: agent.silence_check_seconds ?? null,
  silencePrompt: agent.silence_prompt ?? "",
  silenceHangupSeconds: agent.silence_hangup_seconds ?? null,
  interruptionMinWords: agent.interruption_min_words ?? null,
  whatsappMessageIds: agent.whatsapp_message_ids ?? [],
  parts: Object.fromEntries(
    AGENT_PARTS.map((p) => [p, { source: "text", text: agent[p] ?? "" }]),
  ) as AgentDraft["parts"],
  classifications: (agent.classifications ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
  })),
  tab: "details",
});

/* ------------------------------ Local storage ----------------------------- */

const storageKey = (agentId: string | null) =>
  `calling-agent:draft:${agentId ?? "new"}`;

export const loadDraft = (agentId: string | null): AgentDraft | null => {
  try {
    const raw = localStorage.getItem(storageKey(agentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AgentDraft>;
    return {
      ...emptyDraft(),
      ...parsed,
      llmProvider: parsed.llmProvider || "sarvam",
      llmModel: parsed.llmModel ?? "",
      sttProvider: parsed.sttProvider || "sarvam",
      sttModel: parsed.sttModel ?? "",
      silenceCheckSeconds: parsed.silenceCheckSeconds ?? null,
      silencePrompt: parsed.silencePrompt ?? "",
      silenceHangupSeconds: parsed.silenceHangupSeconds ?? null,
      interruptionMinWords: parsed.interruptionMinWords ?? null,
      whatsappMessageIds: parsed.whatsappMessageIds ?? [],
      classifications: parsed.classifications ?? [],
    };
  } catch {
    return null;
  }
};

/** Returns false when the browser refused to store it (usually quota exceeded) */
export const saveDraft = (
  agentId: string | null,
  draft: AgentDraft,
): boolean => {
  try {
    localStorage.setItem(
      storageKey(agentId),
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
};

export const clearDraft = (agentId: string | null) => {
  try {
    localStorage.removeItem(storageKey(agentId));
  } catch {
    // nothing to clean up
  }
};

/* -------------------------------- Validation ------------------------------ */

export const isPartFilled = (part: PartDraft) => part.text.trim().length > 0;

export const missingRequired = (draft: AgentDraft): string[] => [
  ...(draft.name.trim() ? [] : ["details"]),
  ...AGENT_PARTS.filter((p) => p !== "extra" && !isPartFilled(draft.parts[p])),
];

/**
 * Read an uploaded .txt/.md file as strict UTF-8, matching the backend's checks
 */
export async function readTextFile(file: File): Promise<string> {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!UPLOAD_EXTENSIONS.includes(ext))
    throw new Error("Only .txt or .md files are allowed.");
  if (file.size > UPLOAD_MAX_BYTES)
    throw new Error("File must be 1 MB or smaller.");

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer(),
    );
  } catch {
    throw new Error("File must be UTF-8 text.");
  }
  if (!text.trim()) throw new Error("File is empty.");
  return text.replace(/^﻿/, "");
}

/* ------------------------------ Request bodies ---------------------------- */

const appendPart = (form: FormData, part: AgentPart, draft: PartDraft) => {
  if (draft.source === "file" && draft.fileName) {
    form.append(
      `${part}_file`,
      new File([draft.text], draft.fileName, { type: "text/plain" }),
    );
  } else {
    form.append(`${part}_text`, draft.text);
  }
};

/** Full multipart body for POST /api/agents */
export function toCreateForm(draft: AgentDraft): FormData {
  const form = new FormData();
  form.append("name", draft.name.trim());
  if (draft.greeting.trim()) form.append("greeting", draft.greeting.trim());
  if (draft.voice) form.append("voice", draft.voice);
  if (draft.primaryLanguage)
    form.append("primary_language", draft.primaryLanguage);
  if (draft.secondaryLanguage)
    form.append("secondary_language", draft.secondaryLanguage);
  if (draft.llmProvider) form.append("llm_provider", draft.llmProvider);
  if (draft.llmModel) form.append("llm_model", draft.llmModel);
  if (draft.sttProvider) form.append("stt_provider", draft.sttProvider);
  if (draft.sttModel) form.append("stt_model", draft.sttModel);

  if (
    draft.silenceCheckSeconds !== null &&
    draft.silenceCheckSeconds !== undefined &&
    !isNaN(draft.silenceCheckSeconds)
  ) {
    form.append("silence_check_seconds", String(draft.silenceCheckSeconds));
  }
  if (draft.silencePrompt && draft.silencePrompt.trim()) {
    form.append("silence_prompt", draft.silencePrompt.trim());
  }
  if (
    draft.silenceHangupSeconds !== null &&
    draft.silenceHangupSeconds !== undefined &&
    !isNaN(draft.silenceHangupSeconds)
  ) {
    form.append("silence_hangup_seconds", String(draft.silenceHangupSeconds));
  }
  if (
    draft.interruptionMinWords !== null &&
    !isNaN(draft.interruptionMinWords)
  ) {
    form.append("interruption_min_words", String(draft.interruptionMinWords));
  }

  if (draft.whatsappMessageIds && draft.whatsappMessageIds.length > 0) {
    form.append(
      "whatsapp_message_ids",
      JSON.stringify(draft.whatsappMessageIds),
    );
  }

  for (const part of AGENT_PARTS) {
    if (isPartFilled(draft.parts[part]))
      appendPart(form, part, draft.parts[part]);
  }
  if (draft.classifications && draft.classifications.length > 0) {
    form.append(
      "classifications",
      JSON.stringify(
        draft.classifications.map((c) => ({
          name: c.name.trim(),
          description: c.description.trim(),
        })),
      ),
    );
  }
  return form;
}

/** Only the fields that differ from the saved agent, for PATCH /api/agents/{id} */
export function toUpdateForm(draft: AgentDraft, agent: Agent): FormData | null {
  const form = new FormData();
  if (draft.name.trim() !== agent.name) form.append("name", draft.name.trim());
  if (draft.greeting.trim() !== (agent.greeting ?? ""))
    form.append("greeting", draft.greeting.trim());
  if (draft.voice !== (agent.voice ?? "")) form.append("voice", draft.voice);
  // Sent as a pair: the backend checks them together (secondary needs a primary)
  if (
    draft.primaryLanguage !== (agent.primary_language ?? "") ||
    draft.secondaryLanguage !== (agent.secondary_language ?? "")
  ) {
    form.append("primary_language", draft.primaryLanguage);
    form.append("secondary_language", draft.secondaryLanguage);
  }
  if (draft.llmProvider !== (agent.llm_provider ?? "")) {
    form.append("llm_provider", draft.llmProvider);
    form.append("llm_model", draft.llmModel);
  } else if (draft.llmModel !== (agent.llm_model ?? "")) {
    form.append("llm_model", draft.llmModel);
  }
  if (draft.sttProvider !== (agent.stt_provider ?? "")) {
    form.append("stt_provider", draft.sttProvider);
    form.append("stt_model", draft.sttModel);
  } else if (draft.sttModel !== (agent.stt_model ?? "")) {
    form.append("stt_model", draft.sttModel);
  }

  if (draft.silenceCheckSeconds !== (agent.silence_check_seconds ?? null)) {
    if (
      draft.silenceCheckSeconds !== null &&
      !isNaN(draft.silenceCheckSeconds)
    ) {
      form.append("silence_check_seconds", String(draft.silenceCheckSeconds));
    }
  }
  if (draft.silencePrompt.trim() !== (agent.silence_prompt ?? "").trim()) {
    form.append("silence_prompt", draft.silencePrompt.trim());
  }
  if (draft.silenceHangupSeconds !== (agent.silence_hangup_seconds ?? null)) {
    if (
      draft.silenceHangupSeconds !== null &&
      !isNaN(draft.silenceHangupSeconds)
    ) {
      form.append("silence_hangup_seconds", String(draft.silenceHangupSeconds));
    }
  }
  if (draft.interruptionMinWords !== (agent.interruption_min_words ?? null)) {
    if (
      draft.interruptionMinWords !== null &&
      !isNaN(draft.interruptionMinWords)
    ) {
      form.append("interruption_min_words", String(draft.interruptionMinWords));
    }
  }

  if (
    JSON.stringify(draft.whatsappMessageIds) !==
    JSON.stringify(agent.whatsapp_message_ids ?? [])
  ) {
    form.append(
      "whatsapp_message_ids",
      JSON.stringify(draft.whatsappMessageIds),
    );
  }

  for (const part of AGENT_PARTS) {
    const p = draft.parts[part];
    // The backend ignores empty parts on PATCH, so a cleared part can't be sent
    if (
      isPartFilled(p) &&
      (p.source === "file" || p.text !== (agent[part] ?? ""))
    ) {
      appendPart(form, part, p);
    }
  }
  return [...form.keys()].length ? form : null;
}

// ------------------------------------------ Campaign Dreaft-----------------------------------------------

export const emptyCampaignDraft=():CampaignDraft=>({
    name:"",
    calling_agent:"",
    status:"",
    plivo_pools:"",
    call_transfor_agents:"",
    transfer_ring_time:"",
    start_at:"",
    end_at:"",
    calling_houe_start:"",
    calling_hour_end:"",
    call_days:"",
    parallel_calls:"",
    max_live_calls:"",
    new_calls_per_sceond:"",
    retry_attempts:"",
    min_between_retires:"",
    retry_when_call_is:""
})

export const loadCampaignDraft = (campaignId: string | null): CampaignDraft | null => {
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CampaignDraft>;
    return {
      ...emptyCampaignDraft(),
      ...parsed,
    };
  } catch {
    return null;
  }
};

export const saveCampaignDraft = (
  campaignId: string | null,
  draft: CampaignDraft,
): boolean => {
  try {
    localStorage.setItem(
      storageKey(campaignId),
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
};

export const clearCampaignDraft = (campaignId: string | null) => {
  try {
    localStorage.removeItem(storageKey(campaignId));
  } catch {
    // nothing to clean up
    console.error("Error in the clean Up of campaign Draft")
  }
};

