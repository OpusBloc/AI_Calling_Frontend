// src/lib/api.ts
import { showErrorNotification } from "@/hooks/useNotification";
import { clearToken, getToken } from "@/lib/auth";
import type { CreatePlivoPoolBody, PatchPlivoPoolBody, PlivoNumber, PlivoPool } from "@/types/types";

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

/**
 * Call the backend through the Next.js `/api` proxy with the saved JWT
 */
export async function api<T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // FormData goes as multipart (the browser sets the boundary header itself)
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
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

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Every failed endpoint call surfaces as a notification; callers still get the error
    const error = new ApiError(detailMessage(data?.detail, res.status), res.status);
    showErrorNotification(error.message, { title: "Request failed" });
    throw error;
  }
  return data as T;
}

// Number Pool endpoints
export const getPlivoNumbers = () => api<PlivoNumber[]>("/plivo-numbers");

export const syncPlivoNumbers = () =>
  api<Record<string, unknown>>("/plivo-numbers/sync", { method: "POST" });

export const getPlivoPools = () => api<PlivoPool[]>("/plivo-pools");

export const createPlivoPool = (body: CreatePlivoPoolBody) =>
  api<PlivoPool>("/plivo-pools", { method: "POST", body });

export const patchPlivoPool = (id: string, body: PatchPlivoPoolBody) =>
  api<PlivoPool>(`/plivo-pools/${encodeURIComponent(id)}`, { method: "PATCH", body });

export const deletePlivoPool = (id: string) =>
  api<void>(`/plivo-pools/${encodeURIComponent(id)}`, { method: "DELETE" });

export const getAvailablePlivoNumbers = (id: string) =>
  api<PlivoNumber[]>(`/plivo-pools/${encodeURIComponent(id)}/available-numbers`);
