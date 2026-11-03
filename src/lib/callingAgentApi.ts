// src/lib/callingAgentApi.ts
import { api } from "@/lib/api";

/* --------------------------------- Agents --------------------------------- */

/** Text parts of an agent, in prompt order. All but `extra` are required. */
/** Languages an agent can speak (Sarvam TTS) */
export const AGENT_LANGUAGES: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "te-IN": "Telugu",
  "ta-IN": "Tamil",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "gu-IN": "Gujarati",
  "bn-IN": "Bengali",
  "pa-IN": "Punjabi",
  "od-IN": "Odia",
};

export const AGENT_PARTS = ["intro", "rules", "knowledge", "ending", "extra"] as const;
export type AgentPart = (typeof AGENT_PARTS)[number];

export interface WhatsAppMessage {
  id: string;
  name: string;
  content: string;
  template_id: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessageInput {
  name: string;     
  content: string;
  template_id: string;
}

export interface Agent {
  id: string;
  name: string;
  greeting: string | null;
  /** Stock Sarvam voice id; null uses the system default voice */
  voice: string | null;
  /** Language the agent starts in (e.g. en-IN); null uses the system language */
  primary_language: string | null;
  /** Only other language the agent may switch to */
  secondary_language: string | null;
  silence_check_seconds?: number | null;
  silence_prompt?: string | null;
  silence_hangup_seconds?: number | null;
  whatsapp_message_ids?: string[] | null;
  whatsapp_messages?: WhatsAppMessage[] | null;
  intro: string;
  rules: string;
  knowledge: string;
  ending: string;
  extra: string | null;
  classifications?: Array<{
    id: string;
    name: string;
    description: string;
  }> | null;
  created_at: string;
  updated_at: string;
}



export const listAgents = () => api<Agent[]>("/agents");
export const getAgent = (id: string) => api<Agent>(`/agents/${id}`);
/** Multipart: `name`, `greeting`, `voice`, and per part either `<part>_file` or `<part>_text` */
export const createAgent = (form: FormData) => api<Agent>("/agents", { method: "POST", body: form });
/** Multipart, any subset of the create fields; parts not sent stay unchanged */
export const updateAgent = (id: string, form: FormData) =>
  api<Agent>(`/agents/${id}`, { method: "PATCH", body: form });
export const deleteAgent = (id: string) => api<void>(`/agents/${id}`, { method: "DELETE" });

/* --------------------------------- Voices --------------------------------- */

/** One stock Sarvam voice from the uploaded voice list (CSV/Excel) */
export interface CatalogVoice {
  voice_id: string;
  speaker: string;
  language_code: string;
  lang_tag?: string | null;
  style?: string | null;
}

export const listVoiceCatalog = () => api<{ total: number; voices: CatalogVoice[] }>("/voices/catalog");
/** Multipart `file` (.csv/.xlsx); replaces the whole list */
export const uploadVoiceCatalog = (form: FormData) => api<unknown>("/voices/catalog", { method: "POST", body: form });

/** A voice cloned from a recording (Sarvam voice library) */
export interface CustomVoice {
  id: string;
  name: string;
  language: string | null;
  gender: string | null;
}

const asRecord = (v: unknown) => (typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Sarvam's list is passed through as-is, so accept its usual wrappers */
export const listCustomVoices = async (): Promise<CustomVoice[]> => {
  const root = asRecord(await api<unknown>("/voices?limit=200"));
  const data = root.data ?? root;
  const rows = Array.isArray(data) ? data : (asRecord(data).voices ?? asRecord(data).items ?? []);
  return (Array.isArray(rows) ? rows : [])
    .map((r) => {
      const row = asRecord(r);
      const id = str(row.voice_id) ?? str(row.id);
      return id ? { id, name: str(row.name) ?? id, language: str(row.language), gender: str(row.gender) } : null;
    })
    .filter((v): v is CustomVoice => v !== null);
};

/**
 * Clone a voice from a 10–15 s recording and speak `text` with it. Returns the spoken
 * preview and the new voice's id (null when the X-Voice-Id header isn't readable).
 */
export const createCustomVoice = async (input: { file: File; name: string; language: string; gender?: string; text: string }) => {
  const form = new FormData();
  form.set("file", input.file);
  form.set("name", input.name);
  form.set("language", input.language);
  form.set("text", input.text);
  form.set("output_audio_codec", "mp3");
  if (input.gender) form.set("gender", input.gender);
  const res = await api<Response>("/voices", { method: "POST", body: form, responseType: "response" });
  return { voiceId: res.headers.get("X-Voice-Id"), audio: await res.blob() };
};

/** Speak `text` with a saved custom voice; returns the audio */
export const speakWithCustomVoice = (input: { voiceId: string; text: string; language: string }) => {
  const form = new FormData();
  form.set("voice_id", input.voiceId);
  form.set("text", input.text);
  form.set("language_code", input.language);
  form.set("output_audio_codec", "mp3");
  return api<Blob>("/voices/clone", { method: "POST", body: form, responseType: "blob" });
};

export interface SpeakInput {
  text: string;
  /** Stock voice id */
  speaker: string;
  target_language_code: string;
  pace?: number;
  speech_sample_rate?: number;
  output_audio_codec?: "mp3" | "wav";
}
/** Speak `text` with a stock voice; the stored sample's audio is at /voices/speak/{id}/audio */
export const speakSample = (body: SpeakInput) => api<{ id: string }>("/voices/speak", { method: "POST", body });
export const getSpeakAudio = (id: string) =>
  api<Blob>(`/voices/speak/${encodeURIComponent(id)}/audio`, { responseType: "blob" });

export interface TestCallInput {
  /** Digits, optionally starting with "+" */
  phone: string;
  /** Customer name the agent may use */
  name?: string;
  /** Plivo number to call from; omitted = picked automatically */
  from_number?: string;
  /** Transfer agent to ring; omitted = every active one */
  representative_id?: string;
}

export interface TestCallResult {
  status: "calling";
  to: string;
  from: string;
  agent_id: string;
  representative_id: string | null;
  request_uuid: string | null;
}

/** Choices for the test call's "call from" and "transfer to" dropdowns */
export interface TestCallNumber {
  phone_e164: string;
  alias: string | null;
}
export interface TestCallRepresentative {
  id: string;
  name: string;
  phone_e164: string;
}
export const listTestCallNumbers = () => api<TestCallNumber[]>("/agents/test-call/plivo-numbers");
export const listTestCallRepresentatives = () => api<TestCallRepresentative[]>("/agents/test-call/representatives");

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


/* ----------------------------- Classifications ---------------------------- */

export interface Classification {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  /** Calls currently in this classification */
  calls: number;
  created_at: string;
  updated_at: string;
}

export interface ClassificationSummary {
  agent_id: string;
  campaign_id: string | null;
  total_calls: number;
  unclassified_calls: number;
  classifications: Classification[];
}

export type ClassificationInput = { name: string; description: string };

export interface ClassificationCall {
  call_uuid: string | null;
  attempt_id: string | null;
  campaign_id: string | null;
  classification_id: string | null;
  classification: string | null;
  reason: string | null;
  phone: string | null;
  name: string | null;
  duration_seconds: number | null;
  ended_at: string | null;
  status: string | null;
  hangup_cause: string | null;
  transfer_status: string | null;
  audio: string | null;
  transcript: unknown;
  classified_at: string | null;
}

export interface ClassificationCallsResponse {
  total: number;
  page: number;
  page_size: number;
  campaign_id: string | null;
  calls: ClassificationCall[];
}

export interface ClassificationCallsParams {
  campaign_id?: string;
  page?: number;
  page_size?: number;
}

export const getClassifications = (agentId: string, campaignId?: string) =>
  api<ClassificationSummary>(
    `/agents/${agentId}/classifications${campaignId ? `?campaign_id=${encodeURIComponent(campaignId)}` : ""}`,
  );

export const getClassification = (agentId: string, classificationId: string) =>
  api<Classification>(`/agents/${agentId}/classifications/${classificationId}`);

export const getClassificationCalls = (
  agentId: string,
  classificationId: string,
  params?: ClassificationCallsParams,
) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.campaign_id) query.set("campaign_id", params.campaign_id);
  const qs = query.toString();
  return api<ClassificationCallsResponse>(
    `/agents/${agentId}/classifications/${classificationId}/calls${qs ? `?${qs}` : ""}`,
  );
};

export const getUnclassifiedCalls = (
  agentId: string,
  params?: ClassificationCallsParams,
) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  if (params?.campaign_id) query.set("campaign_id", params.campaign_id);
  const qs = query.toString();
  return api<ClassificationCallsResponse>(
    `/agents/${agentId}/classifications/unclassified/calls${qs ? `?${qs}` : ""}`,
  );
};

export const createClassification = (agentId: string, body: ClassificationInput) =>
  api<Classification>(`/agents/${agentId}/classifications`, { method: "POST", body });

export const updateClassification = (agentId: string, id: string, body: Partial<ClassificationInput>) =>
  api<Classification>(`/agents/${agentId}/classifications/${id}`, { method: "PATCH", body });

export const deleteClassification = (agentId: string, id: string) =>
  api<void>(`/agents/${agentId}/classifications/${id}`, { method: "DELETE" });

export const getCampaignClassifications = (campaignId: string) =>
  api<ClassificationSummary>(`/campaigns/${campaignId}/classifications`);

export const getCampaignClassificationCalls = (
  campaignId: string,
  classificationId: string,
  params?: { page?: number; page_size?: number },
) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  const qs = query.toString();
  return api<ClassificationCallsResponse>(
    `/campaigns/${campaignId}/classifications/${classificationId}/calls${qs ? `?${qs}` : ""}`,
  );
};

export const getCampaignUnclassifiedCalls = (
  campaignId: string,
  params?: { page?: number; page_size?: number },
) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.page_size) query.set("page_size", String(params.page_size));
  const qs = query.toString();
  return api<ClassificationCallsResponse>(
    `/campaigns/${campaignId}/classifications/unclassified/calls${qs ? `?${qs}` : ""}`,
  );
};

// ----------------------------------------whatsapp messages-------------------------------------

export const listWhatsAppMessages = () =>
  api<WhatsAppMessage[]>("/whatsapp-messages");

export const listClassifications = (agentId: string, campaignId?: string) =>
  api(`/api/agents/${agentId}/classifications${campaignId ? `?campaign_id=${campaignId}` : ""}`);

export const getWhatsAppMessage = (id: string) =>
  api<WhatsAppMessage>(`/whatsapp-messages/${encodeURIComponent(id)}`);
export const createWhatsAppMessage = (body: WhatsAppMessageInput) =>
  api<WhatsAppMessage>("/whatsapp-messages", { method: "POST", body });
export const updateWhatsAppMessage = (id: string, body: Partial<WhatsAppMessageInput>) =>
  api<WhatsAppMessage>(`/whatsapp-messages/${encodeURIComponent(id)}`, { method: "PATCH", body });
export const deleteWhatsAppMessage = (id: string) =>
  api<void>(`/whatsapp-messages/${encodeURIComponent(id)}`, { method: "DELETE" });

