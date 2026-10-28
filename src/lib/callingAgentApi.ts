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
export const createRepresentative = (body: RepresentativeInput) =>
  api<Representative>("/representatives", { method: "POST", body });
export const updateRepresentative = (id: string, body: Partial<RepresentativeInput>) =>
  api<Representative>(`/representatives/${id}`, { method: "PATCH", body });
export const deleteRepresentative = (id: string) =>
  api<void>(`/representatives/${id}`, { method: "DELETE" });
