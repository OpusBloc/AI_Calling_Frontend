

  "use client";

  import { useEffect, useId, useRef, useState } from "react";
  import { formatMoney } from "@/components/ui";
  import type { CostTrendPoint } from "@/lib/costFormat";
  export type { CostTrendPoint } from "@/lib/costFormat";
  import { ChartSkeleton, SkeletonBoundary, SummaryCardSkeleton } from "@/components/skeletons";
  import type { CallCostSummary } from "@/types/types";

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

  type Part = { key: string; label: string; detail?: string; value: number; color: string };

  /* ----------------------------- Semi-circle chart ---------------------------- */


  const CX = 250;
  const CY = 250;
  const R_OUT = 225;
  const R_IN = 120;
  const STROKE = 8;
  const GAP = 0.02;

  const pt = (r: number, theta: number) => [CX + r * Math.cos(theta), CY - r * Math.sin(theta)];

  function slicePath(startFrac: number, endFrac: number) {
    const pad = STROKE / 2;
    const ro = R_OUT - pad;
    const ri = R_IN + pad;
    const t0 = Math.PI - startFrac * Math.PI;
    const t1 = Math.PI - endFrac * Math.PI;
    const large = endFrac - startFrac > 0.5 ? 1 : 0;
    const [ox0, oy0] = pt(ro, t0);
    const [ox1, oy1] = pt(ro, t1);
    const [ix1, iy1] = pt(ri, t1);
    const [ix0, iy0] = pt(ri, t0);
    return `M${ox0} ${oy0} A${ro} ${ro} 0 ${large} 1 ${ox1} ${oy1} L${ix1} ${iy1} A${ri} ${ri} 0 ${large} 0 ${ix0} ${iy0} Z`;
  }


  function outlinePath(startFrac: number, endFrac: number) {
    const ro = R_OUT + 5;
    const ri = R_IN - 5;
    const t0 = Math.PI - startFrac * Math.PI;
    const t1 = Math.PI - endFrac * Math.PI;
    const large = endFrac - startFrac > 0.5 ? 1 : 0;
    const [ox0, oy0] = pt(ro, t0);
    const [ox1, oy1] = pt(ro, t1);
    const [ix1, iy1] = pt(ri, t1);
    const [ix0, iy0] = pt(ri, t0);
    return `M${ox0} ${oy0} A${ro} ${ro} 0 ${large} 1 ${ox1} ${oy1} L${ix1} ${iy1} A${ri} ${ri} 0 ${large} 0 ${ix0} ${iy0} Z`;
  }


  function SemiDonut({
    parts,
    grandTotal,
    totalLabel,
    caption,
    active,
    setActive,
  }: {
    parts: Part[];
    grandTotal: number;
    totalLabel: string;
    caption?: string;
    active: string | null;
    setActive: (k: string | null) => void;
  }) {
    const chartRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number; pointerX: number; pointerAtTop: boolean; startX: number; startY: number; targetX: number; targetY: number; color: string } | null>(null);
    const shown = parts.filter((p) => p.value > 0);
    const sum = shown.reduce((a, p) => a + p.value, 0) || 1;

    let cursor = 0;

    const arcs = shown.map((p) => {
      const frac = p.value / sum;
      const start = cursor + GAP / 2;
      const end = Math.max(cursor + frac - GAP / 2, start + 0.004);
      cursor += frac;

      return { ...p, start, end };
    });
const activePart = shown.find((part) => part.key === active);
const activeArc = arcs.find((arc) => arc.key === active);

const activeArcStart = activeArc?.start;
const activeArcEnd = activeArc?.end;
const activeArcColor = activeArc?.color;

    useEffect(() => {
if (
  activeArcStart === undefined ||
  activeArcEnd === undefined ||
  activeArcColor === undefined ||
  !chartRef.current ||
  !tooltipRef.current
) return;

      const chart = chartRef.current;
      const tooltip = tooltipRef.current;
      const updatePosition = () => {
        const bounds = chart.getBoundingClientRect();
        const width = tooltip.offsetWidth;
        const height = tooltip.offsetHeight;
        if (!bounds.width || !bounds.height || !width || !height) return;

        const theta = Math.PI - ((activeArcStart + activeArcEnd) / 2) * Math.PI;
        const targetRadius = R_OUT - STROKE / 2;
        const targetX = (CX + targetRadius * Math.cos(theta)) * (bounds.width / 500);
        const targetY = (CY - targetRadius * Math.sin(theta)) * (bounds.height / 270);
        const left = Math.min(Math.max(targetX - width / 2, 8), bounds.width - width - 8);
        const pointerAtTop = targetY < height + 18;
        const top = Math.min(
          Math.max(pointerAtTop ? targetY + 10 : targetY - height - 10, 4),
          bounds.height - height - 4,
        );
        const pointerX = Math.min(Math.max(targetX - left, 12), width - 12);
        const sx = 500 / bounds.width;
        const sy = 270 / bounds.height;

        setTooltipPosition({
          left,
          top,
          pointerX,
          pointerAtTop,
          startX: (left + pointerX) * sx,
          startY: (pointerAtTop ? top : top + height) * sy,
          targetX: targetX * sx,
          targetY: targetY * sy,
          color: activeArcColor,
        });
      };

      updatePosition();
      const observer = new ResizeObserver(updatePosition);
      observer.observe(chart);
      observer.observe(tooltip);
      return () => observer.disconnect();
    }, [
  activeArcStart,
  activeArcEnd,
  activeArcColor,
  activePart?.label,
  activePart?.value,
    ]);

    return (
      <div ref={chartRef} className="relative w-full min-w-0">
        <svg
          viewBox="0 0 500 270"
          className="block h-auto w-full"
          role="img"
          aria-label={shown.map((p) => `${p.label}: ${rupees(p.value, 2)}`).join(", ")}
        >
          {tooltipPosition && (
            <path
              d={`M ${tooltipPosition.startX} ${tooltipPosition.startY} C ${tooltipPosition.startX} ${(tooltipPosition.startY + tooltipPosition.targetY) / 2}, ${tooltipPosition.targetX} ${(tooltipPosition.startY + tooltipPosition.targetY) / 2}, ${tooltipPosition.targetX} ${tooltipPosition.targetY}`}
              fill="none"
              stroke={tooltipPosition.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              pointerEvents="none"
              style={{ opacity: activePart ? 0.75 : 0, transition: "d 180ms ease, opacity 180ms ease" }}
            />
          )}

          {arcs.map((a) => {
            const isActive = active === a.key;

            return (
              <g
                key={a.key}
                onMouseEnter={() => setActive(a.key)}
                onMouseLeave={() => setActive(null)}
                style={{ cursor: "pointer" }}
              >
                <path
                  d={slicePath(a.start, a.end)}
                  strokeWidth={STROKE}
                  strokeLinejoin="round"
                  style={{
                    fill: a.color,
                    stroke: a.color,
                    opacity: active && !isActive ? 0.35 : 1,
                    transition: "opacity 200ms ease",
                  }}
                />
                <path
                  d={outlinePath(a.start, a.end)}
                  fill="none"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  style={{ stroke: a.color, opacity: isActive ? 1 : 0, transition: "opacity 180ms ease" }}
                  pointerEvents="none"
                />
              </g>
            );
          })}

          <g pointerEvents="none">
            <text x={CX} y={CY - 66} textAnchor="middle" fontSize="13" className="fill-current text-muted">{totalLabel}</text>
            <text x={CX} y={CY - 30} textAnchor="middle" fontSize="32" fontWeight="600" className="fill-current text-heading">{rupees(grandTotal, 2)}</text>
            <text x={CX} y={CY - 8} textAnchor="middle" fontSize="11" className="fill-current text-muted">{caption}</text>
          </g>
        </svg>

        <div
          ref={tooltipRef}
          role="tooltip"
          aria-hidden={!activePart}
          className={`pointer-events-none absolute z-10 flex w-max max-w-[calc(100%-16px)] items-center gap-2 rounded-lg border bg-surface px-3 py-2 shadow-md transition-[opacity,transform] duration-200 ease-out ${activePart && tooltipPosition ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
          style={{
            left: tooltipPosition?.left ?? "50%",
            top: tooltipPosition?.top ?? 0,
            transform: tooltipPosition ? undefined : "translateX(-50%)",
            borderColor: tooltipPosition?.color ?? "transparent",
          }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: activePart ? activePart.color : "transparent" }} />
          <span className="min-w-0 truncate text-sm font-semibold text-heading">{activePart?.label ?? ""}</span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-heading">{activePart ? rupees(activePart.value, 2) : ""}</span>
          {tooltipPosition && activePart && (
            <span
              aria-hidden="true"
              className={`absolute h-[8px] w-[10px] -translate-x-1/2 [clip-path:polygon(0_0,100%_0,50%_100%)] ${tooltipPosition.pointerAtTop ? "rotate-180" : ""}`}
              style={{ left: tooltipPosition.pointerX, top: tooltipPosition.pointerAtTop ? -7 : "calc(100% - 1px)", backgroundColor: activePart.color }}
            />
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------ Cost trend chart ----------------------------- */

  const TW = 560;
  const TH = 270;
  const PAD = { l: 52, r: 18, t: 18, b: 30 };

  function smooth(pts: [number, number][], minY: number, maxY: number) {
    if (pts.length < 2) return "";
    const clamp = (y: number) => Math.min(maxY, Math.max(minY, y));
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] ?? p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6);
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6);
      d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  function TrendChart({ data }: { data: CostTrendPoint[] }) {
    const gid = useId().replace(/:/g, "");
    const [mode, setMode] = useState<"cumulative" | "daily">("cumulative");
    const [hover, setHover] = useState<number | null>(null);

    let run = 0;
    const series = data.map((d) => {
      run += d.cost;
      return { date: d.date, value: mode === "cumulative" ? run : d.cost };
    });

    const maximum = Math.max(...series.map((s) => s.value), 0);
    const top = maximum > 0 ? maximum * 1.2 : 4;
    const innerW = TW - PAD.l - PAD.r;
    const innerH = TH - PAD.t - PAD.b;
    const base = PAD.t + innerH;
    const x = (i: number) => PAD.l + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
    const y = (v: number) => PAD.t + innerH - (v / top) * innerH;
    const pts = series.map((s, i) => [x(i), y(s.value)] as [number, number]);
    const line = smooth(pts, PAD.t, base);
    const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0]} ${base} L${pts[0][0]} ${base} Z` : "";
    const ticks = [0, 1, 2, 3, 4].map((i) => (top * i) / 4);
    const labelEvery = Math.max(1, Math.ceil(series.length / 6));
    const h = hover !== null ? series[hover] : null;
    const hx = hover !== null ? pts[hover][0] : 0;
    const hy = hover !== null ? pts[hover][1] : 0;
    const tipW = 148;
    const tipX = Math.min(Math.max(hx - tipW / 2, PAD.l), TW - PAD.r - tipW);
    const singleBarWidth = Math.min(64, innerW);
    const singleBarHeight = Math.max(0, base - pts[0][1]);
    const singleBarX = x(0) - singleBarWidth / 2;

    return (
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-heading">Cost trend</h3>
          <div role="radiogroup" aria-label="Trend type" className="inline-flex rounded-md border border-hairline bg-surface-input p-0.5">
            {(["cumulative", "daily"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`h-7 rounded px-2.5 text-xs font-medium capitalize transition-colors ${
                  mode === m ? "bg-surface text-heading shadow-sm" : "text-muted hover:text-heading"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <svg
          viewBox={`0 0 ${TW} ${TH}`}
          className="w-full"
          role="img"
          aria-label={`${mode} cost over ${series.length} days, latest ${rupees(series[series.length - 1]?.value, 2)}`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--series-1)", stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: "var(--series-1)", stopOpacity: 0.02 }} />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={TW - PAD.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-hairline" strokeDasharray="3 4" />
              <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" className="fill-current text-muted">
                ₹{Math.round(t).toLocaleString("en-IN")}
              </text>
            </g>
          ))}

          {series.length === 1 ? (
            <>
              <rect
                x={singleBarX}
                y={pts[0][1]}
                width={singleBarWidth}
                height={singleBarHeight}
                rx={8}
                style={{ fill: "var(--series-1)" }}
              />
              <text x={x(0)} y={Math.max(PAD.t + 12, pts[0][1] - 8)} textAnchor="middle" fontSize="13" fontWeight="600" className="fill-current text-heading">
                {rupees(series[0].value, 2)}
              </text>
            </>
          ) : (
            <>
              {area && <path d={area} fill={`url(#g${gid})`} />}
              {line && <path d={line} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--series-1)" }} />}
            </>
          )}

          {series.map((s, i) =>
            i % labelEvery === 0 || i === series.length - 1 ? (
              <text key={s.date + i} x={x(i)} y={TH - 8} textAnchor="middle" fontSize="11" className="fill-current text-muted">
                {s.date}
              </text>
            ) : null,
          )}

          {h && (
            <g pointerEvents="none">
              <line x1={hx} x2={hx} y1={PAD.t} y2={base} stroke="currentColor" className="text-hairline" />
              <circle cx={hx} cy={hy} r={5} strokeWidth={2.5} style={{ fill: "var(--surface)", stroke: "var(--series-1)" }} />
              <rect x={tipX} y={Math.max(hy - 42, 2)} width={tipW} height={30} rx={8} style={{ fill: "var(--surface)", stroke: "var(--series-1)" }} />
              <text x={tipX + tipW / 2} y={Math.max(hy - 42, 2) + 19} textAnchor="middle" fontSize="12" fontWeight="600" className="fill-current text-heading">
                {h.date} · {rupees(h.value, 2)}
              </text>
            </g>
          )}

          <rect
            x={PAD.l}
            y={PAD.t}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - box.left) / box.width;
              setHover(Math.min(series.length - 1, Math.max(0, Math.round(ratio * (series.length - 1)))));
            }}
          />
        </svg>
      </div>
    );
  }

  /* --------------------------------- Component -------------------------------- */

  export default function CostSplit({
    parts: input,
    summaryData,
    loading,
    plivoBilling,
    plivoAttempts,
    totalOverride,
    totalLabel,
    summaryCaption,
    description = "",
    trend,
    trendLoading,
  }: {
    parts?: CostParts;
    summaryData?: CallCostSummary;
    loading: boolean;
    plivoBilling?: number;
    plivoAttempts?: number;
    totalOverride?: number;
    totalLabel?: string;
    summaryCaption?: string;
    description?: string;
    trend?: CostTrendPoint[];
    trendLoading?: boolean;
  }) {
    const [active, setActive] = useState<string | null>(null);

    const parts = summaryData
      ? {
          stt: summaryData.stt_cost,
          llm: summaryData.llm_cost,
          tts: summaryData.tts_cost,
          aiTotal: summaryData.total_cost,
          gst: summaryData.gst_cost,
          models: {
            stt: summaryData.rates.stt_model,
            llm: summaryData.rates.llm_model,
            tts: summaryData.rates.tts_model,
          },
        }
      : input;

    const aiParts: Part[] = parts
      ? [
          { key: "stt", label: "Speech-to-text", detail: parts.models?.stt, value: parts.stt, color: "var(--series-1)" },
          { key: "llm", label: "AI model", detail: parts.models?.llm, value: parts.llm, color: "var(--series-2)" },
          { key: "tts", label: "Text-to-speech", detail: parts.models?.tts, value: parts.tts, color: "var(--series-3)" },
        ]
      : [];

    const aiSubtotal = aiParts.reduce((sum, p) => sum + p.value, 0);
    const gst = parts?.gst ?? 0;
    const aiTotal = parts?.aiTotal ?? aiSubtotal + gst;
    const aiAdjustment = aiTotal - aiSubtotal - gst;
    const summaryPlivo = summaryData?.plivo_cost_inr;
    const hasPlivoBilling = summaryPlivo !== undefined || plivoBilling !== undefined;
    const plivoTotal = summaryPlivo ?? plivoBilling ?? 0;
    const billedAttempts = summaryData?.plivo_billed_attempts ?? plivoAttempts;

    const allParts: Part[] = [
      ...aiParts,
      ...(gst > 0
        ? [{ key: "gst", label: "GST", detail: "Goods and Services Tax", value: gst, color: "var(--series-4, var(--accent))" }]
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
      ...(hasPlivoBilling
        ? [{
            key: "plivo",
            label: "Plivo billing",
            detail: billedAttempts === undefined ? "Telephony charges" : `${billedAttempts.toLocaleString()} billed attempts`,
            value: plivoTotal,
            color: "var(--series-5, var(--accent))",
          }]
        : []),
    ];

    const grandTotal = summaryData?.grand_total?.INR ?? totalOverride ?? aiTotal + plivoTotal;
    const centerLabel = totalLabel ?? (hasPlivoBilling ? "Total campaign cost" : "Total AI cost");
    const centerCaption =
      summaryCaption ??
      (hasPlivoBilling ? `AI cost ${rupees(aiTotal, 2)} + Plivo ${rupees(plivoTotal, 2)}` : "Includes the reported AI cost and GST.");


  return (
    <div className="relative z-0 grid min-w-0 grid-cols-1 items-stretch gap-4 overflow-visible xl:grid-cols-2">

      {/* Cost breakdown card */}
      <section className="relative z-20 flex h-full min-w-0 flex-col overflow-visible rounded-lg border border-hairline bg-surface p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-semibold text-heading">
          Where the cost goes
        </h3>

        {description && (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        )}

        <SkeletonBoundary loading={loading} skeleton={<div className="mt-4"><SummaryCardSkeleton /><div className="mt-4"><ChartSkeleton height="h-56" /></div></div>}>
          {grandTotal === 0 ? (
            <p className="py-4 text-center text-sm text-muted">No AI or Plivo spend yet.</p>
          ) : (
            <div className="mt-4 min-w-0">
              <SemiDonut parts={allParts} grandTotal={grandTotal} totalLabel={centerLabel} caption={centerCaption} active={active} setActive={setActive} />
            </div>
          )}
        </SkeletonBoundary>
      </section>

      {/* Cost trend card */}
      <section className="relative z-0 h-full min-w-0 rounded-lg border border-hairline bg-surface p-4 shadow-sm sm:p-5">
        <SkeletonBoundary loading={!!trendLoading} skeleton={<ChartSkeleton height="h-72" />}>
          {trend && trend.length > 0 ? (
            <TrendChart data={trend} />
          ) : (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
            <h3 className="text-sm font-semibold text-heading">
              Cost trend
            </h3>
            <p className="mt-1 text-sm text-muted">
              No cost data yet
            </p>
          </div>
          )}
        </SkeletonBoundary>
      </section>

    </div>
  );

  }
