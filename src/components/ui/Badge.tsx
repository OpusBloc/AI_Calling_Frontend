"use client";

import clsx from "clsx";

export type Tone = "neutral" | "gain" | "loss" | "info" | "warn" | "accent";

const TONES: Record<Tone, string> = {
  neutral: "bg-chip text-muted",
  gain: "bg-gain-bg text-gain",
  loss: "bg-loss-bg text-loss",
  info: "bg-info-bg text-info",
  warn: "bg-warn-bg text-warn",
  accent: "bg-accent-bg text-accent-text",
};

/**
 * Status pill. Tones are the design system's muted financial semantics —
 * gain/loss/info/warn — never raw Tailwind greens and reds.
 */
export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
