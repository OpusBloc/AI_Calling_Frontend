"use client";

import type { CSSProperties } from "react";

export type CallerNumberUsage = { phone: string; calls: number };
export type DailyCallDatum = { date: string; calls: number };

export default function CallerNumbersMiniChart({
  numbers,
  dailyCalls,
  color = "var(--caller-chart-default)",
}: {
  numbers: CallerNumberUsage[];
  dailyCalls: DailyCallDatum[];
  color?: string;
}) {
  const topNumbers = [...numbers]
    .filter((number) => Number.isFinite(number.calls) && number.calls > 0)
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 3);
  const values = dailyCalls.slice(-7);
  const counts = values.map((day) => day.calls);
  const hasDailyTrend =
    counts.length > 1 &&
    counts.some((count) => Number.isFinite(count) && count > 0) &&
    Math.max(...counts) !== Math.min(...counts);

  if (topNumbers.length === 0 && !hasDailyTrend) {
    return (
      <div
        className="dashboard-caller-chart flex h-[88px] w-[140px] items-center justify-center text-xs text-muted"
        style={{ "--caller-chart-color-light": color } as CSSProperties}
        role="img"
        aria-label="No caller number usage yet"
      >
        No usage yet
      </div>
    );
  }

  const maxNumberCalls = Math.max(1, ...topNumbers.map((number) => number.calls));
  const minDailyCalls = Math.min(...counts);
  const maxDailyCalls = Math.max(...counts);
  const dailyRange = maxDailyCalls - minDailyCalls || 1;
  const linePoints = hasDailyTrend
    ? values.map((day, index) => ({
        ...day,
        x: 4 + (index * 132) / Math.max(1, values.length - 1),
        y: 22 - ((day.calls - minDailyCalls) / dailyRange) * 14,
      }))
    : [];

  let linePath = "";
  if (linePoints.length > 1) {
    linePath = `M ${linePoints[0].x.toFixed(1)} ${linePoints[0].y.toFixed(1)}`;
    for (let index = 1; index < linePoints.length - 1; index += 1) {
      const point = linePoints[index];
      const next = linePoints[index + 1];
      linePath += ` Q ${point.x.toFixed(1)} ${point.y.toFixed(1)} ${((point.x + next.x) / 2).toFixed(1)} ${((point.y + next.y) / 2).toFixed(1)}`;
    }
    const last = linePoints[linePoints.length - 1];
    linePath += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  }

  return (
    <svg
      viewBox="0 0 140 88"
      className="dashboard-caller-chart h-[88px] w-[140px] overflow-visible"
      style={{ "--caller-chart-color-light": color } as CSSProperties}
      role="img"
      aria-label={`${topNumbers.length} most-used caller numbers${hasDailyTrend ? "; varying calls per day over the last seven days" : ""}`}
    >
      {topNumbers.map((number, index) => {
        const barWidth = 18;
        const gap = 16;
        const totalWidth = topNumbers.length * barWidth + (topNumbers.length - 1) * gap;
        const x = (140 - totalWidth) / 2 + index * (barWidth + gap);
        const height = Math.max(7, (number.calls / maxNumberCalls) * 44);
        return (
          <g key={number.phone}>
            <rect
              x={x}
              y={72 - height}
              width={barWidth}
              height={height}
              rx="7"
              fill="var(--caller-chart-color)"
              fillOpacity={index === 0 ? 1 : 0.3}
            >
              <title>{`${number.phone}: ${number.calls} ${number.calls === 1 ? "call" : "calls"}`}</title>
            </rect>
            <text x={x + barWidth / 2} y="84" textAnchor="middle" className="fill-muted text-[10px]">
              N{index + 1}
            </text>
          </g>
        );
      })}
      {hasDailyTrend && (
        <>
          <path
            d={linePath}
            fill="none"
            stroke="color-mix(in srgb, var(--caller-chart-color) 68%, var(--tooltip-text) 32%)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
          {linePoints.map((point) => (
            <circle key={point.date} cx={point.x} cy={point.y} r="5" fill="transparent" pointerEvents="all">
              <title>{`${point.date}: ${point.calls} ${point.calls === 1 ? "call" : "calls"}`}</title>
            </circle>
          ))}
        </>
      )}
    </svg>
  );
}
