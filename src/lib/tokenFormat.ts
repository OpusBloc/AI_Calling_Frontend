export type TokenIdParts = {
  id: string | number;
  parentTokenId?: string | number;
  flatTokenId?: string | number;
  parentFlatTokenId?: string | number;
  subflatTokenId?: string | number;
};

function normalizeId(value?: string | number | null): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  if (s === '' || s === '0') return undefined;
  return s;
}

/**
 * Builds a compact display string like:
 * #123 • Flat 5 • Sub 2
 * Falls back gracefully if some parts are missing.
 */
export function formatTokenRef(parts: TokenIdParts): string {
  const parent = normalizeId(parts.parentTokenId) ?? normalizeId(parts.id) ?? '';
  const flatBase = normalizeId(parts.parentFlatTokenId) ?? normalizeId(parts.flatTokenId);
  const sub = normalizeId(parts.subflatTokenId);

  const segments: string[] = [`#${parent}`];
  if (flatBase) segments.push(`Flat ${flatBase}`);
  if (sub) segments.push(`Sub ${sub}`);
  return segments.join(' • ');
}


