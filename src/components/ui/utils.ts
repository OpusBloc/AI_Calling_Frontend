export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong.";

export const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

export const formatDay = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" })
    : "—";

/** 125 → "2m 5s", 3725 → "1h 2m" */
export const formatDuration = (seconds: number | null | undefined) => {
  const s = Math.round(seconds ?? 0);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
};

/** Number with fixed decimals; accepts the backend's numeric strings */
export const formatMoney = (
  value: number | string | null | undefined,
  digits = 2,
) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "—";
};

/** "in_progress" → "In progress" */
export const humanize = (value: string) =>
  value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

