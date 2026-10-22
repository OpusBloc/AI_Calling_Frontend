export function normalizeAddress(addr?: string | null): string | null {
  if (!addr || typeof addr !== 'string') return null;
  const trimmed = addr.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

export function addressesEqual(a?: string | null, b?: string | null): boolean {
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);
  return !!na && !!nb && na === nb;
}

export function isValidAddress(addr?: string | null): boolean {
  return normalizeAddress(addr) !== null;
}


