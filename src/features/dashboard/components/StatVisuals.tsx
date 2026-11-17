"use client";

import type { CSSProperties } from "react";

export function DonutRing({
  value,
  max,
  color,
  trackColor,
  ariaLabel,
  tooltip,
}: {
  value: number;
  max: number;
  color?: string;
  trackColor?: string;
  ariaLabel?: string;
  tooltip?: string;
}) {
  const hasValues = Number.isFinite(max) && max > 0 && Number.isFinite(value);
  const progress = hasValues ? Math.max(0, Math.min(1, value / max)) : 0;
  const percent = Math.round(progress * 100);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const stroke = color ?? "var(--stat-accent)";
  const trackStroke = trackColor ?? "var(--chart-grid)";

  return (
    <svg viewBox="0 0 100 100" className="h-[100px] w-[100px]" role="img" aria-label={ariaLabel ?? (hasValues ? `${percent}% active` : "0% active; no data")}>
      {tooltip && <title>{tooltip}</title>}
      <circle cx="50" cy="50" r={radius} fill="none" stroke={trackColor ? trackStroke : hasValues ? trackStroke : "var(--text-faint)"} strokeOpacity={trackColor ? 0.15 : hasValues ? 0.22 : 0.45} strokeWidth="8" />
      {hasValues && (
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          transform="rotate(-90 50 50)"
          className="dashboard-stat-ring-progress"
          key={percent}
          style={{
            "--ring-circumference": `${circumference}`,
            "--ring-dasharray": `${circumference * progress} ${circumference}`,
          } as CSSProperties}
        />
      )}
      <text x="50" y="54" textAnchor="middle" className="fill-heading text-xs font-medium">
        {percent}%
      </text>
    </svg>
  );
}

export function MiniBars({
  data,
  color,
  highlightIndex,
  labels = [],
  metricLabel = "items",
}: {
  data: number[];
  color?: string;
  highlightIndex?: number;
  labels?: string[];
  metricLabel?: string;
}) {
  const stroke = color ?? "var(--stat-accent)";
  const hasItems = data.length > 0;
  const hasPositiveValue = data.some((item) => Number.isFinite(item) && item > 0);
  const values = hasItems ? data.slice(-7) : Array.from({ length: 7 }, () => 0);
  const shownLabels = hasItems ? labels.slice(-7) : [];
  const maxValue = Math.max(0, ...values);
  const tallestIndex = highlightIndex ?? values.indexOf(maxValue);

  return (
    <svg
      viewBox="0 0 140 90"
      className="h-[88px] w-[140px]"
      role="img"
      aria-label={hasItems ? `${metricLabel} per agent: ${shownLabels.map((name, index) => `${name}, ${values[index]}`).join("; ")}` : "No agents to show"}
    >
      {values.map((item, index) => {
        const height = hasPositiveValue && item > 0 ? Math.max(8, (item / maxValue) * 60) : hasItems ? 0 : 3;
        const highlighted = hasPositiveValue && index === tallestIndex;
        return (
          <g key={index}>
            {height > 0 && (
              <rect
                x={12 + index * 18}
                y={70 - height}
                width="10"
                height={height}
                rx="4"
                fill={hasPositiveValue ? stroke : "var(--text-faint)"}
                fillOpacity={hasPositiveValue ? (highlighted ? 1 : 0.3) : 0.55}
              />
            )}
            <text x={17 + index * 18} y="86" textAnchor="middle" className="fill-muted text-[10px]">
              {item}
            </text>
            {shownLabels[index] && (
              <title>{`${shownLabels[index]}: ${item} ${metricLabel}`}</title>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Sparkline({ data, color }: { data: number[]; color?: string }) {
  const hasData = data.length > 1 && data.some((item) => Number.isFinite(item) && item > 0);
  const stroke = hasData ? color ?? "var(--stat-accent)" : "var(--text-faint)";
  let path = "M 2 30 L 118 30";

  if (hasData) {
    const values = data.slice(-7);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((item, index) => {
        const x = 3 + (index * 114) / Math.max(1, values.length - 1);
        const y = 48 - ((item - min) / range) * 36;
        return { x, y };
      });
    path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      path += ` Q ${current.x.toFixed(1)} ${current.y.toFixed(1)} ${((current.x + next.x) / 2).toFixed(1)} ${((current.y + next.y) / 2).toFixed(1)}`;
    }
    const last = points[points.length - 1];
    path += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  }

  return (
    <svg viewBox="0 0 120 60" className="h-[60px] w-[120px]" role="img" aria-label={hasData ? "Calls per day over the last seven days" : "Daily call history unavailable"}>
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
