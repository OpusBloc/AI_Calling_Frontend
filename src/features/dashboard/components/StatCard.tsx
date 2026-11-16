"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { SkeletonBoundary } from "@/components/skeletons";
import { DashboardStatValueSkeleton, DashboardStatVisualSkeleton, OverviewStatValueSkeleton } from "@/components/skeletons";

type Accent = { light: string; dark: string };

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
  accent: Accent;
  value: ReactNode;
  label: ReactNode;
  loading?: boolean;
  href?: string;
  children: ReactNode;
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

  const { title, icon, accent, value, label, loading = false, href, children } = props;
  const style = {
    "--stat-accent-light": accent.light,
    "--stat-accent-dark": accent.dark,
  } as CSSProperties;

  const content = (
    <div className="relative h-full w-full min-w-0 overflow-hidden">
      {/* Title: top-left */}
      <div className="flex min-w-0 max-w-[58%] items-center gap-2">
        <span className="shrink-0 [&>svg]:h-[20px] [&>svg]:w-[20px]" style={{ color: "var(--stat-accent)" }} aria-hidden="true">
          {icon}
        </span>
        <h2 className="min-w-0 truncate text-sm font-medium leading-tight text-heading">{title}</h2>
      </div>

      {/* Value + label: bottom-left */}
      <div className="absolute bottom-0 left-0 min-w-0 max-w-[55%]">
        <SkeletonBoundary loading={loading} skeleton={<DashboardStatValueSkeleton />}>
          <>
            <p className="text-xl font-semibold leading-none tracking-tight text-heading">{value}</p>
            <p className="mt-2 whitespace-nowrap text-sm text-muted">{label}</p>
          </>
        </SkeletonBoundary>
      </div>

      {/* Chart: fills the right side of the card and scales to fit */}
      <div
        className="absolute inset-y-0 right-0 flex w-[60%] min-w-0 items-center justify-center overflow-hidden [&>*]:max-h-full [&>*]:max-w-full [&>svg]:h-full [&>svg]:w-full"
      >
        <SkeletonBoundary loading={loading} skeleton={<DashboardStatVisualSkeleton />}>
          {children}
        </SkeletonBoundary>
      </div>
    </div>
  );

  const className = `dashboard-stat-card relative flex h-[130px] min-w-0 origin-center flex-col rounded-2xl border border-[var(--stat-card-border)] bg-surface px-3 pt-2 pb-3 shadow-md transition-all duration-200 ease-out hover:z-10 motion-safe:hover:scale-[1.01] hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:scale-100${href ? " cursor-pointer" : ""}`;

  return href ? (
    <Link href={href} className={className} style={style}>
      {content}
    </Link>
  ) : (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
