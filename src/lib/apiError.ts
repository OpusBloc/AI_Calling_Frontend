/**
 * Pulls the backend's own message out of a failed request.
 *
 * Handlers should surface this rather than a hardcoded string: the backend
 * explains *why* it rejected the request ("Insufficient balance for payout",
 * "Property not found or not live"), and a generic "Transfer failed" throws
 * that away and leaves the admin with nothing to act on.
 *
 * The backend is inconsistent about the envelope, so every shape it actually
 * returns is handled:
 *   "some message"
 *   { message: "..." }            { message: ["...", "..."] }   ← class-validator
 *   { error: "..." }              { reasons: ["...", "..."] }
 *   { data: { message: "..." } }
 *
 * `fallback` is only used when the response carries no usable text at all —
 * a network failure, a timeout, or an empty body.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const pick = (value: unknown): string | null => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const joined = value
        .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
        .join(", ");
      if (joined) return joined;
    }
    return null;
  };

  const fromBody = (body: unknown): string | null => {
    const direct = pick(body);
    if (direct) return direct;
    if (!body || typeof body !== "object") return null;

    const b = body as Record<string, unknown>;
    for (const key of ["message", "reasons", "error", "errors", "detail"]) {
      const hit = pick(b[key]);
      if (hit) return hit;
    }
    // Some endpoints nest the real payload one level down.
    if (b.data && typeof b.data === "object") return fromBody(b.data);
    return null;
  };

  const response = (error as { response?: { data?: unknown } })?.response;
  const fromResponse = fromBody(response?.data);
  if (fromResponse) return fromResponse;

  /* A timeout or dropped connection has no response body. Axios' own
     "timeout of 60000ms exceeded" is not useful to an admin, so those keep the
     caller's fallback. */
  const code = (error as { code?: string })?.code;
  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || code === "ERR_NETWORK") {
    return fallback;
  }

  const message = (error as { message?: unknown })?.message;
  if (typeof message === "string" && message.trim() && !/^timeout of/i.test(message)) {
    return message;
  }

  return fallback;
}
