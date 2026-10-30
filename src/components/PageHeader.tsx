import { PageTopBar } from "@/components/ui";

export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  meta,
  backHref,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Shown above the title on pages more than one level deep */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Small inline items next to the title, e.g. a status badge */
  meta?: React.ReactNode;
  /** Where Back goes when there's no history; defaults to the parent breadcrumb, else the dashboard. null = only real history */
  backHref?: string | null;
}) {
  return (
    <div>
      <PageTopBar breadcrumbs={breadcrumbs} backHref={backHref} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-heading sm:text-[28px]">{title}</h1>
            {meta}
          </div>
          {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
