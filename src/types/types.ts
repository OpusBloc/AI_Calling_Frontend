import type { components } from "./api";

export type Campaign = components["schemas"]["CampaignResponse"] & {
  ended_at?: string | null;
  concurrent_calls?: number | null;
};
export type CampaignCreate = components["schemas"]["CampaignCreate"];
export type CampaignUpdate = components["schemas"]["CampaignUpdate"];
export type LeadPool = components["schemas"]["LeadPoolResponse"];
export type LeadPoolCreate = components["schemas"]["LeadPoolCreate"];
export type LeadPoolUpdate = components["schemas"]["LeadPoolUpdate"];
export type LeadImportResult = components["schemas"]["LeadImportResult"];
export type Lead = components["schemas"]["LeadResponse"];

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
