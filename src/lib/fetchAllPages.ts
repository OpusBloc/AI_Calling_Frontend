import { api } from "@/lib/api";

/**
 * Shape the paginated admin endpoints return:
 * `{ success, page, limit, total, totalPages, data }`.
 */
type PagedResponse<T> = {
  data?: T[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

/** Hard stop so a bad `totalPages` can never spin forever. */
const MAX_PAGES = 100;

/**
 * Walks every page of a paginated admin endpoint and returns the combined rows.
 *
 * Pickers that need the *whole* list (transfer recipients, for example) used to
 * request a single page with a large `limit`, which silently dropped anyone past
 * that limit. This follows `totalPages` instead, so the list is complete
 * regardless of how many records exist.
 *
 * @param url    endpoint path, passed straight to `api.get`
 * @param limit  page size to request (the backend defaults to 10)
 * @param params extra query params merged into every request
 */
export async function fetchAllPages<T>(
  url: string,
  limit = 100,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  for (;;) {
    const res = await api.get<PagedResponse<T>>(url, {
      params: { ...params, page, limit },
    });

    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    all.push(...rows);

    if (rows.length === 0) break;

    const totalPages = Number(res.data?.totalPages);
    const total = Number(res.data?.total);
    // The server echoes the page size it actually applied. Trusting the value
    // we *requested* would end the walk early if the backend ever caps `limit`
    // below it — a full page would look like a short one.
    const pageSize = Number(res.data?.limit) || limit;

    if (Number.isFinite(total) && total > 0 && all.length >= total) break;

    if (Number.isFinite(totalPages) && totalPages > 0) {
      if (page >= totalPages) break;
    } else if (rows.length < pageSize) {
      // No totalPages in the response — a short page is the only end signal.
      break;
    }

    page += 1;
    if (page > MAX_PAGES) break;
  }

  return all;
}
