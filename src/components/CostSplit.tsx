"use client";

import { Card, Skeleton, formatMoney } from "@/components/ui";

export const rupees = (n: number | undefined, digits = 2) =>
  n === undefined ? "—" : `₹${formatMoney(n, digits)}`;

export type CostParts = {
  stt: number;
  llm: number;
  tts: number;
  aiTotal?: number;
  gst?: number;
  models?: { stt?: string; llm?: string; tts?: string };
};

export default function CostSplit({
  parts: input,
  loading,
  plivoBilling,
  plivoAttempts,
  totalOverride,
  totalLabel,
  summaryCaption,
  description = "Breakdown of AI and telephony spending.",
}: {
  parts: CostParts | undefined;
  loading: boolean;
  plivoBilling?: number;
  plivoAttempts?: number;
  totalOverride?: number;
  totalLabel?: string;
  summaryCaption?: string;
  description?: string;
}) {
  const aiParts = input
    ? [
        { key: "stt", label: "Speech-to-text", detail: input.models?.stt, value: input.stt, color: "var(--series-1)" },
        { key: "llm", label: "AI model", detail: input.models?.llm, value: input.llm, color: "var(--series-2)" },
        { key: "tts", label: "Text-to-speech", detail: input.models?.tts, value: input.tts, color: "var(--series-3)" },
      ]
    : [];

  const aiSubtotal = aiParts.reduce((sum, p) => sum + p.value, 0);
  const gst = input?.gst ?? 0;
  const aiTotal = input?.aiTotal ?? aiSubtotal + gst;
  const aiAdjustment = aiTotal - aiSubtotal - gst;
  const hasPlivoBilling = plivoBilling !== undefined;
  const plivoTotal = plivoBilling ?? 0;

  const allParts = [
    ...aiParts,
    ...(gst > 0
      ? [{
          key: "gst",
          label: "GST",
          detail: "Goods and Services Tax",
          value: gst,
          color: "var(--series-4, var(--accent))",
        }]
      : []),
    ...(Math.abs(aiAdjustment) > 0.005
      ? [{
          key: "ai-adjustment",
          label: "AI taxes / adjustments",
          detail: "Included in reported AI cost",
          value: aiAdjustment,
          color: "var(--series-4, var(--accent))",
        }]
      : []),
    ...(hasPlivoBilling ? [{
      key: "plivo",
      label: "Plivo billing",
      detail: plivoAttempts === undefined ? "Telephony charges" : `${plivoAttempts.toLocaleString()} billed attempts`,
      value: plivoTotal,
      color: "var(--series-5, var(--accent))",
    }] : []),
  ];

  const grandTotal = totalOverride ?? aiTotal + plivoTotal;

  const share = (n: number) =>
    grandTotal > 0 ? Math.round((n / grandTotal) * 100) : 0;

  return (
    <Card
      title="Where the cost goes"
      description={description}
    >
      {loading ? (
        <Skeleton className="h-24 rounded-md" />
      ) : grandTotal === 0 ? (
        <p className="py-4 text-center text-sm text-muted">
          No AI or Plivo spend yet.
        </p>
      ) : (
        <div className="space-y-5">
          {/* Total cost */}
          <div className="rounded-lg border border-hairline bg-raised p-4">
            <p className="text-sm text-muted">{totalLabel ?? (hasPlivoBilling ? "Total campaign cost" : "Total AI cost")}</p>
            <p className="mt-1 text-2xl font-semibold text-heading tnum">
              {rupees(grandTotal, 2)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {summaryCaption ?? (hasPlivoBilling ? `AI cost ${rupees(aiTotal, 2)} + Plivo ${rupees(plivoTotal, 2)}` : "Includes the reported AI cost and applicable GST.")}
            </p>
          </div>

          {/* Cost distribution */}
          <div
            className="flex h-4 w-full gap-[2px] overflow-hidden rounded"
            role="img"
            aria-label={allParts.map(
              (p) => `${p.label} ${share(p.value)}%`
            ).join(", ")}
          >
            {allParts
              .filter((p) => p.value > 0)
              .map((p) => (
                <div
                  key={p.key}
                  title={`${p.label}: ${rupees(p.value, 2)} (${share(p.value)}%)`}
                  className="h-full transition-opacity hover:opacity-80"
                  style={{
                    width: `${(p.value / grandTotal) * 100}%`,
                    background: p.color,
                    minWidth: 4,
                  }}
                />
              ))}
          </div>

          {/* Cost breakdown */}
          <dl className="grid gap-4 sm:grid-cols-2">
            {allParts.map((p) => (
              <div key={p.key} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: p.color }}
                />
                <div className="min-w-0">
                  <dt className="text-sm font-medium text-heading">
                    {p.label}
                  </dt>
                  <dd className="tnum text-sm text-body">
                    {rupees(p.value, 2)}
                    <span className="text-muted">
                      {" "}· {share(p.value)}%
                    </span>
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
