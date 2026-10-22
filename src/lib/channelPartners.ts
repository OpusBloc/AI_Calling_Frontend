import { channelPartnerApi } from "@/lib/api";
import type { Tone } from "@/components/ui";

/** cp-backend's PaginationQueryDto caps `limit` at 100. */
const PAGE_LIMIT = 100;
/** Hard stop so a bad `total` can never spin forever (20,000 partners). */
const MAX_PAGES = 200;

/**
 * Every partner from GET /channel-partner/admin/partners, walking all pages.
 *
 * Partner pickers used to request one page of 100, so anyone past the 100th
 * partner was missing from the dropdown — and from its search. `params` takes
 * only ListPartnersQueryDto keys (`type`, `status`, `search`); the DTO is
 * forbidNonWhitelisted, so anything else would 400.
 */
export async function fetchAllChannelPartners<T extends { partnerId?: string }>(
  params: Record<string, string> = {},
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await channelPartnerApi.get("/channel-partner/admin/partners", {
      params: { ...params, page, limit: PAGE_LIMIT },
    });
    const body = res.data?.data ?? res.data;
    const items: T[] = Array.isArray(body) ? body : (body?.items ?? []);
    all.push(...items);

    const total = Number(body?.total);
    if (items.length < PAGE_LIMIT) break;
    if (Number.isFinite(total) && all.length >= total) break;
  }
  return all.filter((partner) => partner?.partnerId);
}

/** Badge for a channel partner, by cp-backend partner status. */
export function cpBadge(status?: string | null): { label: string; tone: Tone } {
  switch (String(status || "").toUpperCase()) {
    case "PENDING":
      return { label: "Pending CP", tone: "warn" };
    case "ACTIVE":
      return { label: "Active CP", tone: "accent" };
    case "SUSPENDED":
      return { label: "Suspended CP", tone: "loss" };
    case "TERMINATED":
      return { label: "Terminated CP", tone: "neutral" };
    default:
      return { label: "Channel Partner", tone: "accent" };
  }
}
