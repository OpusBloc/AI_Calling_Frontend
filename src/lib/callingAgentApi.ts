// src/lib/callingAgentApi.ts
import { api } from "@/lib/api";

/* --------------------------------- Agents --------------------------------- */

/** Text parts of an agent, in prompt order. All but `extra` are required. */
export const AGENT_PARTS = ["intro", "rules", "knowledge", "ending", "extra"] as const;
export type AgentPart = (typeof AGENT_PARTS)[number];

export interface Agent {
  id: string;
  name: string;
  greeting: string | null;
  intro: string;
  rules: string;
  knowledge: string;
  ending: string;
  extra: string | null;
  created_at: string;
  updated_at: string;
}

export const listAgents = () => api<Agent[]>("/agents");
export const getAgent = (id: string) => api<Agent>(`/agents/${id}`);
/** Multipart: `name`, `greeting`, and per part either `<part>_file` or `<part>_text` */
export const createAgent = (form: FormData) => api<Agent>("/agents", { method: "POST", body: form });
/** Multipart, any subset of the create fields; parts not sent stay unchanged */
export const updateAgent = (id: string, form: FormData) =>
  api<Agent>(`/agents/${id}`, { method: "PATCH", body: form });
export const deleteAgent = (id: string) => api<void>(`/agents/${id}`, { method: "DELETE" });

/* --------------------------------- Voices --------------------------------- */

export interface SarvamVoice {
  id: string;
  name: string;
  language?: string | null;
  gender?: string | null;
  accent?: string | null;
  style?: string | null;
  reference_text?: string | null;
  [key: string]: unknown;
}

export const listSarvamVoices = () => api<unknown>("/voices?limit=200");
export const getSarvamVoice = (id: string) => api<unknown>(`/voices/${encodeURIComponent(id)}`);
export const createSarvamVoice = (form: FormData) =>
  api<unknown>("/voices", { method: "POST", body: form });
export const synthesizeSarvamVoice = (form: FormData) =>
  api<Blob>("/voices/clone", { method: "POST", body: form, responseType: "blob" });
export const deleteSarvamVoice = (id: string) =>
  api<void>(`/voices/${encodeURIComponent(id)}`, { method: "DELETE" });

export const uploadSarvamVoiceCatalog = (form: FormData) =>
  api<unknown>("/voices/catalog", { method: "POST", body: form });
export const listSarvamVoiceCatalog = (params: Record<string, string> = {}) => {
  const query = new URLSearchParams(params).toString();
  return api<unknown>(`/voices/catalog${query ? `?${query}` : ""}`);
};
export const deleteSarvamVoiceCatalogEntry = (id: string) =>
  api<void>(`/voices/catalog/${encodeURIComponent(id)}`, { method: "DELETE" });
export const deleteSarvamVoiceCatalog = () => api<void>("/voices/catalog", { method: "DELETE" });
export interface SarvamSpeakInput {
  text: string;
  speaker: string;
  target_language_code: string;
  model: string;
  pace: number;
  speech_sample_rate: number;
  output_audio_codec: string;
}
export const createSarvamSpeakSample = (body: SarvamSpeakInput) =>
  api<unknown>("/voices/speak", { method: "POST", body });
export const listSarvamSpeakSamples = (params: Record<string, string> = {}) => {
  const query = new URLSearchParams(params).toString();
  return api<unknown>(`/voices/speak${query ? `?${query}` : ""}`);
};
export const getSarvamSpeakSample = (id: string) =>
  api<unknown>(`/voices/speak/${encodeURIComponent(id)}`);
export const getSarvamSpeakAudio = (id: string) =>
  api<Blob>(`/voices/speak/${encodeURIComponent(id)}/audio`, { responseType: "blob" });
export const deleteSarvamSpeakSample = (id: string) =>
  api<void>(`/voices/speak/${encodeURIComponent(id)}`, { method: "DELETE" });

export interface TestCallInput {
  /** Digits, optionally starting with "+" */
  phone: string;
  /** Customer name the agent may use */
  name?: string;
}

export interface TestCallResult {
  status: "calling";
  to: string;
  from: string;
  agent_id: string;
  request_uuid: string | null;
}

/** Ring `phone` right now with this agent */
export const testCallAgent = (id: string, body: TestCallInput) =>
  api<TestCallResult>(`/agents/${id}/test-call`, { method: "POST", body });

/* ----------------------------- Representatives ---------------------------- */

export interface Representative {
  id: string;
  name: string;
  phone_e164: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type RepresentativeInput = Pick<Representative, "name" | "phone_e164" | "active">;

export const listRepresentatives = () => api<Representative[]>("/representatives");
export const getRepresentative = (id: string) => api<Representative>(`/representatives/${id}`);
export const createRepresentative = (body: RepresentativeInput) =>
  api<Representative>("/representatives", { method: "POST", body });
export const updateRepresentative = (id: string, body: Partial<RepresentativeInput>) =>
  api<Representative>(`/representatives/${id}`, { method: "PATCH", body });
export const deleteRepresentative = (id: string) =>
  api<void>(`/representatives/${id}`, { method: "DELETE" });
