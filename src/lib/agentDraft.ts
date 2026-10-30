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

export interface AgentDraft {
  name: string;
  greeting: string;
  /** Stock voice id; empty = system default */
  voice: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  parts: Record<AgentPart, PartDraft>;
  tab: string;
  savedAt?: number;
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
  parts: Object.fromEntries(AGENT_PARTS.map((p) => [p, blankPart()])) as AgentDraft["parts"],
  tab: "details",
});

export const draftFromAgent = (agent: Agent): AgentDraft => ({
  name: agent.name,
  greeting: agent.greeting ?? "",
  voice: agent.voice ?? "",
  primaryLanguage: agent.primary_language ?? "",
  secondaryLanguage: agent.secondary_language ?? "",
  parts: Object.fromEntries(
    AGENT_PARTS.map((p) => [p, { source: "text", text: agent[p] ?? "" }]),
  ) as AgentDraft["parts"],
  tab: "details",
});

/* ------------------------------ Local storage ----------------------------- */

const storageKey = (agentId: string | null) => `calling-agent:draft:${agentId ?? "new"}`;

export const loadDraft = (agentId: string | null): AgentDraft | null => {
  try {
    const raw = localStorage.getItem(storageKey(agentId));
    // Drafts saved before a field existed get its default
    return raw ? { ...emptyDraft(), ...(JSON.parse(raw) as AgentDraft) } : null;
  } catch {
    return null;
  }
};

/** Returns false when the browser refused to store it (usually quota exceeded) */
export const saveDraft = (agentId: string | null, draft: AgentDraft): boolean => {
  try {
    localStorage.setItem(storageKey(agentId), JSON.stringify({ ...draft, savedAt: Date.now() }));
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
  if (!UPLOAD_EXTENSIONS.includes(ext)) throw new Error("Only .txt or .md files are allowed.");
  if (file.size > UPLOAD_MAX_BYTES) throw new Error("File must be 1 MB or smaller.");

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new Error("File must be UTF-8 text.");
  }
  if (!text.trim()) throw new Error("File is empty.");
  return text.replace(/^﻿/, "");
}

/* ------------------------------ Request bodies ---------------------------- */

const appendPart = (form: FormData, part: AgentPart, draft: PartDraft) => {
  if (draft.source === "file" && draft.fileName) {
    form.append(`${part}_file`, new File([draft.text], draft.fileName, { type: "text/plain" }));
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
  if (draft.primaryLanguage) form.append("primary_language", draft.primaryLanguage);
  if (draft.secondaryLanguage) form.append("secondary_language", draft.secondaryLanguage);
  for (const part of AGENT_PARTS) {
    if (isPartFilled(draft.parts[part])) appendPart(form, part, draft.parts[part]);
  }
  return form;
}

/** Only the fields that differ from the saved agent, for PATCH /api/agents/{id} */
export function toUpdateForm(draft: AgentDraft, agent: Agent): FormData | null {
  const form = new FormData();
  if (draft.name.trim() !== agent.name) form.append("name", draft.name.trim());
  if (draft.greeting.trim() !== (agent.greeting ?? "")) form.append("greeting", draft.greeting.trim());
  if (draft.voice !== (agent.voice ?? "")) form.append("voice", draft.voice);
  // Sent as a pair: the backend checks them together (secondary needs a primary)
  if (draft.primaryLanguage !== (agent.primary_language ?? "") || draft.secondaryLanguage !== (agent.secondary_language ?? "")) {
    form.append("primary_language", draft.primaryLanguage);
    form.append("secondary_language", draft.secondaryLanguage);
  }
  for (const part of AGENT_PARTS) {
    const p = draft.parts[part];
    // The backend ignores empty parts on PATCH, so a cleared part can't be sent
    if (isPartFilled(p) && (p.source === "file" || p.text !== (agent[part] ?? ""))) {
      appendPart(form, part, p);
    }
  }
  return [...form.keys()].length ? form : null;
}
