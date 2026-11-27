export default function PageHeader({
  title,
  description,
  actions,
  meta,
  leading,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  /** Small inline items next to the title, e.g. a status badge */
  meta?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {leading}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-heading sm:text-[28px]">{title}</h1>
              {meta}
            </div>
            {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
      </div>
    </div>
  );
}
