// src/lib/api.ts
import { showErrorNotification } from "@/hooks/useNotification";
import { clearToken, getToken } from "@/lib/auth";
import type {
  Campaign,
  CampaignCreate,
  CampaignScheduleResult,
  CallOutcome,
  CallOutcomeResult,
  ScheduledCampaignCall,
  CampaignUpdate,
  CallCost,
  CallCostSummary,
  CampaignReport,
  DispatchStatus,
  DispatchControlResponse,
  Paged,
  CreatePlivoPoolBody,
  PatchPlivoPoolBody,
  PlivoNumber,
  PlivoPool,
} from "@/types/types";

/**
 * Error carrying the backend's HTTP status and `detail` message
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const detailMessage = (detail: unknown, status: number): string => {
  if (typeof detail === "string") return detail;
  // FastAPI validation errors: [{ loc, msg }]
  if (Array.isArray(detail)) {
    return detail
      .map((d) => [d?.loc?.slice(1).join("."), d?.msg].filter(Boolean).join(": "))
      .join("; ");
  }
  return `Request failed (${status})`;
};

// Requests go straight to the backend (it must allow this origin via CORS)
export const API_BASE = `${(process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/+$/, "")}/api`;

/**
 * Call the backend with the saved JWT
 */
export async function api<T>(
  path: string,
  { method = "GET", body, responseType = "json" }: { method?: string; body?: unknown; responseType?: "json" | "blob" } = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // FormData goes as multipart (the browser sets the boundary header itself)
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch {
    showErrorNotification("Couldn't reach the server. Check your connection and try again.", {
      title: "Network error",
    });
    throw new ApiError("Couldn't reach the server.", 0);
  }

  // Session no longer valid — AuthGuard sends the user to login
  if (res.status === 401 && token) {
    clearToken();
    showErrorNotification("Please sign in again.", { title: "Session expired" });
    throw new ApiError("Session expired", 401);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    // Every failed endpoint call surfaces as a notification; callers still get the error
    const error = new ApiError(detailMessage(data?.detail, res.status), res.status);
    showErrorNotification(error.message, { title: "Request failed" });
    throw error;
  }
  if (res.status === 204) return undefined as T;
  if (responseType === "blob") return (await res.blob()) as T;

  const data = await res.json().catch(() => null);
  return data as T;
}

// Number Pool endpoints
export const getPlivoNumbers = () => api<PlivoNumber[]>("/plivo-numbers");

export const syncPlivoNumbers = () =>
  api<Record<string, unknown>>("/plivo-numbers/sync", { method: "POST" });

export const getPlivoPools = () => api<PlivoPool[]>("/plivo-pools");

export const getPlivoPool = (id: string) => api<PlivoPool>(`/plivo-pools/${encodeURIComponent(id)}`);

export const createPlivoPool = (body: CreatePlivoPoolBody) =>
  api<PlivoPool>("/plivo-pools", { method: "POST", body });

export const patchPlivoPool = (id: string, body: PatchPlivoPoolBody) =>
  api<PlivoPool>(`/plivo-pools/${encodeURIComponent(id)}`, { method: "PATCH", body });

export const deletePlivoPool = (id: string) =>
  api<void>(`/plivo-pools/${encodeURIComponent(id)}`, { method: "DELETE" });

export const getAvailablePlivoNumbers = (id: string) =>
  api<PlivoNumber[]>(`/plivo-pools/${encodeURIComponent(id)}/available-numbers`);

// Campaign endpoints
export const getCampaigns = async (): Promise<Campaign[]> => {
  const data = await api<Campaign[] | null>("/campaigns");
  if (!Array.isArray(data)) return [];
  return data.map((campaign) => ({
    ...campaign,
    representative_ids: campaign.representative_ids ?? [],
    lead_pool_ids: campaign.lead_pool_ids ?? [],
    plivo_numbers: campaign.plivo_numbers ?? [],
    plivo_pool_ids: campaign.plivo_pool_ids ?? [],
    retry_on: campaign.retry_on ?? [],
  }));
};

export const getCampaignIds = () => api<string[]>("/campaigns/ids");

export const getCampaign = (id: string) =>
  api<Campaign>(`/campaigns/${encodeURIComponent(id)}`);

export const scheduleCampaign = (id: string) =>
  api<CampaignScheduleResult>(`/campaigns/${encodeURIComponent(id)}/schedule`, { method: "POST" });

export const getCampaignCalls = (id: string) =>
  api<ScheduledCampaignCall[]>(`/campaigns/${encodeURIComponent(id)}/calls`);

export const postCampaignCallOutcome = (campaignId: string, callId: string, outcome: CallOutcome) =>
  api<CallOutcomeResult>(`/campaigns/${encodeURIComponent(campaignId)}/calls/${encodeURIComponent(callId)}/outcome`, {
    method: "POST",
    body: { outcome },
  });

/** Multipart: the leads sheet plus the campaign fields as a JSON `payload` */
export const createCampaign = (body: CampaignCreate, leadsFile: File) => {
  const form = new FormData();
  form.append("file", leadsFile);
  form.append("payload", JSON.stringify(body));
  return api<Campaign>("/campaigns", { method: "POST", body: form });
};

export const updateCampaign = (id: string, body: CampaignUpdate) =>
  api<Campaign>(`/campaigns/${encodeURIComponent(id)}`, { method: "PATCH", body });

export const deleteCampaign = (id: string) =>
  api<void>(`/campaigns/${encodeURIComponent(id)}`, { method: "DELETE" });

// Dispatch is per campaign: on = the campaign is scheduled/running, off = paused
export const getCampaignDispatch = (campaignId: string) =>
  api<DispatchStatus>(`/dispatch/campaigns/${encodeURIComponent(campaignId)}/status`);
export const setCampaignDispatch = (campaignId: string, enabled: boolean) =>
  api<DispatchControlResponse>(`/dispatch/campaigns/${encodeURIComponent(campaignId)}/control`, {
    method: "PATCH",
    body: { enabled },
  });

/** Totals plus every call with all its attempts */
export const getCampaignReport = (id: string) =>
  api<CampaignReport>(`/campaigns/${encodeURIComponent(id)}/report`);

// AI usage cost (INR)
export const getCallCostSummary = (days?: number) =>
  api<CallCostSummary>(`/call-costs/summary${days ? `?days=${days}` : ""}`);
export const getCallCosts = (page = 1, pageSize = 10) =>
  api<Paged<CallCost>>(`/call-costs?page=${page}&page_size=${pageSize}`);
