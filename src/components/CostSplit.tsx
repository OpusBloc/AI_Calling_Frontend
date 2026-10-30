"use client";

import { Card, Skeleton, formatMoney } from "@/components/ui";

export const rupees = (n: number | undefined, digits = 2) => (n === undefined ? "—" : `₹${formatMoney(n, digits)}`);

export type CostParts = {
  stt: number;
  llm: number;
  tts: number;
  /** Model names shown under each part, when known */
  models?: { stt?: string; llm?: string; tts?: string };
};

/**
 * Where the AI money goes: one stacked bar (parts of a whole) with a labelled legend,
 * so the split never relies on colour alone. Hover a segment for its exact value.
 * Colours are the theme's first three chart series (validated for colour-blind
 * separation in both themes; the light-theme green needs the visible labels).
 */
export default function CostSplit({
  parts: input,
  loading,
  description = "Share of AI spend in the selected period.",
}: {
  parts: CostParts | undefined;
  loading: boolean;
  description?: string;
}) {
  const parts = input
    ? [
        { key: "stt", label: "Speech-to-text", detail: input.models?.stt, value: input.stt, color: "var(--series-1)" },
        { key: "llm", label: "AI model", detail: input.models?.llm, value: input.llm, color: "var(--series-2)" },
        { key: "tts", label: "Text-to-speech", detail: input.models?.tts, value: input.tts, color: "var(--series-3)" },
      ]
    : [];
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <Card title="Where the cost goes" description={description}>
      {loading ? (
        <Skeleton className="h-24 rounded-md" />
      ) : !total ? (
        <p className="py-4 text-center text-sm text-muted">No AI spend yet.</p>
      ) : (
        <div className="space-y-4">
          <div
            className="flex h-4 w-full gap-[2px] overflow-hidden rounded"
            role="img"
            aria-label={parts.map((p) => `${p.label} ${share(p.value)}%`).join(", ")}
          >
            {parts
              .filter((p) => p.value > 0)
              .map((p) => (
                <div
                  key={p.key}
                  title={`${p.label}: ${rupees(p.value)} (${share(p.value)}%)`}
                  className="h-full transition-opacity first:rounded-l last:rounded-r hover:opacity-80"
                  style={{ width: `${(p.value / total) * 100}%`, background: p.color, minWidth: 4 }}
                />
              ))}
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            {parts.map((p) => (
              <div key={p.key} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
                <div className="min-w-0">
                  <dt className="text-sm font-medium text-heading">{p.label}</dt>
                  <dd className="tnum text-sm text-body">
                    {rupees(p.value)} <span className="text-muted">· {share(p.value)}%</span>
                  </dd>
                  {p.detail && (
                    <dd className="truncate text-xs text-muted" title={p.detail}>
                      {p.detail}
                    </dd>
                  )}
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Card>
  );
}
