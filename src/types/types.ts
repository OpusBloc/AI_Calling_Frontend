import type { components } from "./api";

export type Weekday = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type Campaign = components["schemas"]["CampaignResponse"] & {
  /** Weekdays calls may go out on; empty = every day */
  call_days?: Weekday[];
  ended_at?: string | null;
  concurrent_calls?: number | null;
  /** Safety ceiling on simultaneous live calls (newer backend; not in api.d.ts yet) */
  max_live_calls?: number;
  /** Max new calls started per second */
  calls_per_second?: number;
};
/** Leads now come from an uploaded sheet, so there are no lead pools on create */
export type CampaignCreate = Omit<components["schemas"]["CampaignCreate"], "lead_pool_ids"> & {
  max_live_calls?: number;
  calls_per_second?: number;
  call_days?: Weekday[];
};
export type CampaignUpdate = components["schemas"]["CampaignUpdate"] & {
  max_live_calls?: number | null;
  calls_per_second?: number | null;
  call_days?: Weekday[] | null;
};
export type CampaignScheduleResult = components["schemas"]["ScheduleResult"];

/** One dial of a call, with Plivo's billing/CDR and the conversation */
export interface CallAttempt {
  id: string;
  attempt_no: number;
  status: string;
  plivo_request_uuid?: string | null;
  plivo_call_uuid?: string | null;
  plivo_status?: string | null;
  submitted_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  total_amount?: string | null;
  total_rate?: string | null;
  hangup_cause_code?: number | null;
  hangup_cause_name?: string | null;
  hangup_source?: string | null;
  recording_url?: string | null;
  transcript?: Array<Record<string, string>>;
  transfer_status?: string | null;
  transfer_reason?: string | null;
}

export type ScheduledCampaignCall = Omit<components["schemas"]["ScheduledCallResponse"], "attempt_history"> & {
  attempt_history?: CallAttempt[];
};

/** GET /campaigns/{id}/report */
export interface CampaignReport {
  campaign: { id: string; name: string; status: string; start_at: string; created_at: string };
  summary: {
    total_calls: number;
    live_calls: number;
    queued_calls: number;
    failed_calls: number;
    answered_calls: number;
    transferred_calls: number;
    total_call_seconds: number;
    total_billing: number | string;
    total_run_seconds: number;
    total_run_minutes: number;
    total_call_minutes: number;
  };
  calls: ScheduledCampaignCall[];
}

/** Dispatch is per campaign: on while the campaign is scheduled or running */
export interface DispatchStatus {
  campaign_id: string;
  enabled: boolean;
  status: string;
  ready_outbox: number;
  queued_calls: number;
  active_calls: number;
  uncertain_attempts: number;
  live_calls_enabled: boolean;
  redis_connected: boolean;
  updated_at: string;
}

export interface DispatchControlResponse {
  campaign_id: string;
  enabled: boolean;
  status: string;
  updated_at: string;
  live_calls_enabled: boolean;
}

/** AI usage cost (Sarvam STT/LLM/TTS) in INR — GET /call-costs/summary */
export interface CallCostSummary {
  calls: number;
  seconds: number;
  total_chars: number;
  tts_chars: number;
  stt_seconds: number;
  prompt_tokens: number;
  completion_tokens: number;
  stt_cost: number;
  llm_cost: number;
  tts_cost: number;
  total_cost: number;
  average_per_call: { seconds: number; total_chars: number; tts_chars: number; stt_cost: number; llm_cost: number; tts_cost: number; total_cost: number };
  days: number | null;
  rates: { currency: string; llm_model: string; tts_model: string; stt_model: string; [key: string]: unknown };
}

/** One call's AI cost — GET /call-costs */
export interface CallCost {
  call_uuid: string;
  /** Campaign dispatch attempt this cost belongs to; null for test calls */
  attempt_id: string | null;
  agent_id: string | null;
  agent_name: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  turns: number;
  total_chars: number;
  stt_cost: number;
  llm_cost: number;
  tts_cost: number;
  total_cost: number;
  created_at: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
export type CallOutcome = components["schemas"]["CallOutcome"];
export type CallOutcomeResult = components["schemas"]["CallOutcomeResult"];

/**
 * GET /api/plivo-numbers -> PlivoNumber[]
 * GET /api/plivo-pools -> PlivoPool[]
 */
export interface PlivoNumber {
  phone_e164: string;
  alias: string | null;
  active: boolean;
  number_type: string;
  country: string | null;
  region: string | null;
  voice_enabled: boolean;
  sms_enabled: boolean;
  added_on: string | null;
  synced_at: string;
  plivo_pool_id?: string | null;
  daily_attempt_limit: number;
  max_concurrent_calls: number;
}

export interface PlivoPool {
  id: string;
  name: string;
  status: "active" | "in_progress" | "completed" | "paused";
  pool_size: number;
  concurrency_limit: number;
  phone_numbers: string[];
  // Optional extension: the checked-in API schema does not currently include it.
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePlivoPoolBody {
  name: string;
  status: PlivoPool["status"];
  concurrency_limit: number;
  phone_numbers: string[];
}

export type PatchPlivoPoolBody = Partial<CreatePlivoPoolBody>;
