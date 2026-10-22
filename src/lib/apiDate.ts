/**
 * Parses a date the backend sent, in either shape it uses:
 *
 *   ISO 8601           "2026-11-03T11:16:42.000Z"
 *   en-IN display text "3/11/2026, 4:46:42 pm"   ← D/M/YYYY, IST wall clock
 *
 * Some endpoints (e.g. GET /admin/coupons `expiresAt`) pre-format with
 * `toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })`. `new Date()` reads
 * that as M/D/YYYY, so 3 Nov silently became 11 Mar — always go through this.
 */
export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;
  const input = value.trim();

  const m = input.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i,
  );
  if (m) {
    const [, day, month, year, h, min, sec, meridiem] = m;
    let hour = Number(h ?? 0);
    if (meridiem) {
      const pm = meridiem.toLowerCase() === "pm";
      if (hour === 12) hour = pm ? 12 : 0;
      else if (pm) hour += 12;
    }
    const pad = (n: string | number) => String(n).padStart(2, "0");
    // The text is IST wall-clock time, so pin the offset rather than trusting
    // the admin's browser timezone.
    const d = new Date(
      `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(min ?? 0)}:${pad(sec ?? 0)}+05:30`,
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}
