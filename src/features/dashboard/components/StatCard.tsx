"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { SkeletonBoundary } from "@/components/skeletons";
import { DashboardStatValueSkeleton, OverviewStatValueSkeleton } from "@/components/skeletons";

const TONES = {
  green: "bg-emerald-100 text-emerald-900 dark:bg-primary-soft dark:text-primary-soft-text",
  amber: "bg-amber-100 text-amber-900 dark:bg-primary-soft dark:text-primary-soft-text",
  pink: "bg-pink-100 text-pink-900 dark:bg-primary-soft dark:text-primary-soft-text",
  purple: "bg-purple-100 text-purple-900 dark:bg-primary-soft dark:text-primary-soft-text",
  blue: "bg-sky-100 text-sky-900 dark:bg-primary-soft dark:text-primary-soft-text",
} as const;
type Tone = keyof typeof TONES;

const OVERVIEW_COLORS = {
  blue: { pill: "bg-blue-100 dark:bg-primary-soft", icon: "text-blue-700 dark:text-primary-soft-text", title: "text-blue-700 dark:text-primary-soft-text" },
  pink: { pill: "bg-pink-100 dark:bg-primary-soft", icon: "text-pink-700 dark:text-primary-soft-text", title: "text-pink-700 dark:text-primary-soft-text" },
  emerald: { pill: "bg-emerald-100 dark:bg-primary-soft", icon: "text-emerald-700 dark:text-primary-soft-text", title: "text-emerald-700 dark:text-primary-soft-text" },
  purple: { pill: "bg-purple-100 dark:bg-primary-soft", icon: "text-purple-700 dark:text-primary-soft-text", title: "text-purple-700 dark:text-primary-soft-text" },
  red: { pill: "bg-red-100 dark:bg-primary-soft", icon: "text-red-700 dark:text-primary-soft-text", title: "text-red-700 dark:text-primary-soft-text" },
  orange: { pill: "bg-orange-100 dark:bg-primary-soft", icon: "text-orange-700 dark:text-primary-soft-text", title: "text-orange-700 dark:text-primary-soft-text" },
  violet: { pill: "bg-violet-100 dark:bg-primary-soft", icon: "text-violet-700 dark:text-primary-soft-text", title: "text-violet-700 dark:text-primary-soft-text" },
  amber: { pill: "bg-amber-100 dark:bg-primary-soft", icon: "text-amber-700 dark:text-primary-soft-text", title: "text-amber-700 dark:text-primary-soft-text" },
  teal: { pill: "bg-teal-100 dark:bg-primary-soft", icon: "text-teal-700 dark:text-primary-soft-text", title: "text-teal-700 dark:text-primary-soft-text" },
  sky: { pill: "bg-sky-100 dark:bg-primary-soft", icon: "text-sky-700 dark:text-primary-soft-text", title: "text-sky-700 dark:text-primary-soft-text" },
  indigo: { pill: "bg-indigo-100 dark:bg-primary-soft", icon: "text-indigo-700 dark:text-primary-soft-text", title: "text-indigo-700 dark:text-primary-soft-text" },
} as const;

type OverviewColor = keyof typeof OVERVIEW_COLORS;

type OverviewProps = {
  title: string;
  value: ReactNode;
  subtext?: ReactNode;
  icon: ReactNode;
  color: OverviewColor;
  loading?: boolean;
};

type DashboardProps = {
  title: string;
  icon: ReactNode;
  tone: Tone;
  value: ReactNode;
  label: ReactNode;
  loading?: boolean;
  href?: string;
};

export default function StatCard(props: OverviewProps | DashboardProps) {
  if ("color" in props) {
    const colors = OVERVIEW_COLORS[props.color];
    return (
      <article className="flex h-full min-h-[130px] min-w-0 flex-col justify-between rounded-2xl border border-[var(--stat-border)] bg-surface p-3 shadow-sm">
        <div className={`flex h-9 min-w-0 shrink-0 items-center gap-2.5 rounded-xl px-3 ${colors.pill}`}>
          <span className={`flex shrink-0 [&>svg]:h-4 [&>svg]:w-4 ${colors.icon}`} aria-hidden="true">
            {props.icon}
          </span>
          <h3 className={`truncate text-sm font-medium ${colors.title}`}>{props.title}</h3>
        </div>
        <div className="mt-2 min-w-0">
          <SkeletonBoundary loading={!!props.loading} skeleton={<OverviewStatValueSkeleton />}>
            <>
              <p className="break-words font-sans text-2xl font-semibold leading-none tracking-tight text-heading tabular-nums">{props.value}</p>
              <p className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-muted">{props.subtext ?? "\u00a0"}</p>
            </>
          </SkeletonBoundary>
        </div>
      </article>
    );
  }

  const { title, icon, tone, value, label, loading = false, href } = props;

  const content = (
    <div className="rounded-2xl border border-hairline bg-surface p-1.5">
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${TONES[tone]}`}>
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="truncate">{title}</span>
      </div>
      <div className="min-w-0 px-3 pb-2.5 pt-2">
        <SkeletonBoundary loading={loading} skeleton={<DashboardStatValueSkeleton />}>
          <>
            <p className="truncate text-2xl font-bold tabular-nums font-numeric text-heading">{value}</p>
            <p className="mt-1.5 truncate text-xs text-muted">{label}</p>
          </>
        </SkeletonBoundary>
      </div>
    </div>
  );

  const className = `w-full min-w-0 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md motion-reduce:transition-none${href ? " block cursor-pointer" : ""}`;

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>
      {content}
    </div>
  );
}
