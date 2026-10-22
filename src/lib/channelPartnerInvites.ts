/**
 * Agreement invites this browser has issued, keyed by partner id.
 *
 * Resending needs `partner_agreement_invites.id`, and the only endpoint that
 * returns it is the create call — no admin GET exposes the invite, so the id is
 * kept here when an institution is created. Consequence: Resend is offered only
 * in the browser that created the partner. Once the backend returns the invite
 * on `GET admin/partners/:id`, read it from there and delete this module.
 */

const STORAGE_KEY = "cp_partner_invites";

export type StoredInvite = {
  inviteId: string;
  email?: string;
  sentAt?: string;
  expiresAt?: string;
};

type InviteMap = Record<string, StoredInvite>;

const readMap = (): InviteMap => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as InviteMap) : {};
  } catch {
    return {};
  }
};

const writeMap = (map: InviteMap) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable (private mode / quota) — Resend just won't be offered.
  }
};

/** The invite issued for this partner, or null if this browser never saw it. */
export const getStoredInvite = (partnerId?: string | null): StoredInvite | null => {
  if (!partnerId || typeof window === "undefined") return null;
  return readMap()[partnerId] ?? null;
};

/** Remember (or update, after a resend) the invite issued for a partner. */
export const rememberInvite = (partnerId: string, invite: StoredInvite) => {
  if (!partnerId || !invite?.inviteId || typeof window === "undefined") return;
  const map = readMap();
  map[partnerId] = { ...map[partnerId], ...invite };
  writeMap(map);
};

/** Drop a partner's invite once it is accepted — it can no longer be resent. */
export const forgetInvite = (partnerId: string) => {
  if (!partnerId || typeof window === "undefined") return;
  const map = readMap();
  if (!(partnerId in map)) return;
  delete map[partnerId];
  writeMap(map);
};
