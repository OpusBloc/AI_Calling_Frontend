import { ApiError, api } from "@/lib/api";

export interface Voice {
  id: string;
  name: string;
  language: string | null;
  gender: string | null;
  isDefault: boolean;
}

export interface ListVoicesParams {
  search?: string;
  gender?: "male" | "female";
  accent?: string;
  limit?: number;
  offset?: number;
}

export interface CreateVoiceInput {
  file: File;
  name: string;
  language: string;
  text: string;
  language_code?: string;
  style?: string;
  gender?: string;
  output_audio_codec?: "wav" | "mp3" | "flac" | "opus" | "aac" | "linear16" | "mulaw" | "alaw";
  speech_sample_rate?: number;
  pace?: number;
  enable_text_normalization?: boolean;
}

export interface CreateVoiceResult {
  voiceId: string;
  requestId: string | null;
  duration: number | null;
  audioBlob: Blob;
}

export class VoiceApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "VoiceApiError";
  }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const nonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const validationMessage = (detail: unknown): string | null => {
  if (!Array.isArray(detail)) return null;
  const first = detail[0];
  return first && typeof first.msg === "string" ? first.msg : null;
};

const getAudioDuration = (value: string | null): number | null => {
  if (!value?.trim()) return null;
  const duration = Number(value);
  return Number.isFinite(duration) ? duration : null;
};

export const listVoices = async (params: ListVoicesParams = {}): Promise<Voice[]> => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }

  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  const root = asRecord(await api<unknown>(`/voices${suffix}`));
  const data = root.data ?? root;
  const dataRecord = asRecord(data);
  const rows = Array.isArray(data) ? data : dataRecord.voices ?? dataRecord.items ?? [];

  return (Array.isArray(rows) ? rows : [])
    .map((item): Voice | null => {
      const row = asRecord(item);
      const id = nonEmptyString(row.voice_id) ?? nonEmptyString(row.id);
      if (!id) return null;

      return {
        id,
        name: nonEmptyString(row.name) ?? id,
        language: nonEmptyString(row.language),
        gender: nonEmptyString(row.gender),
        isDefault: row.is_default === true || row.isDefault === true || row.default === true,
      };
    })
    .filter((voice): voice is Voice => voice !== null);
};

/** Get the upstream voice details, including any signed preview URLs. */
export const getVoice = (voiceId: string) =>
  api<Record<string, unknown>>(`/voices/${encodeURIComponent(voiceId)}`);

/** Delete a saved custom voice. */
export const deleteVoice = (voiceId: string) =>
  api<void>(`/voices/${encodeURIComponent(voiceId)}`, { method: "DELETE" });

export const createVoice = async (input: CreateVoiceInput): Promise<CreateVoiceResult> => {
  const name = input.name.trim();
  const text = input.text.trim();
  if (!input.file) throw new VoiceApiError("Choose a reference recording.", 422);
  if (name.length < 1 || name.length > 100) {
    throw new VoiceApiError("Voice name must be between 1 and 100 characters.", 422);
  }
  if (text.length < 1 || text.length > 1000) {
    throw new VoiceApiError("Preview text must be between 1 and 1000 characters.", 422);
  }

  const form = new FormData();
  form.set("file", input.file);
  form.set("name", name);
  form.set("language", input.language);
  form.set("text", text);
  for (const key of [
    "language_code",
    "style",
    "gender",
    "output_audio_codec",
    "speech_sample_rate",
    "pace",
    "enable_text_normalization",
  ] as const) {
    const value = input[key];
    if (value !== undefined && value !== null && value !== "") {
      form.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await api<Response>("/voices", { method: "POST", body: form, responseType: "response" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      throw new VoiceApiError(validationMessage(error.detail) ?? error.message, 422);
    }
    if (error instanceof ApiError) throw new VoiceApiError(error.message, error.status);
    throw error;
  }

  const voiceId = response.headers.get("X-Voice-Id");
  if (!voiceId) {
    throw new VoiceApiError("The voice was created, but the response did not include its voice ID.", response.status);
  }

  return {
    voiceId,
    requestId: response.headers.get("X-Request-Id") || null,
    duration: getAudioDuration(response.headers.get("X-Audio-Duration")),
    audioBlob: await response.blob(),
  };
};
