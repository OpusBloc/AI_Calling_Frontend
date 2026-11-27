"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import clsx from "clsx";

export type AccordionAction =
  | { label: string; href: string }
  | { label: string; onClick: () => void; danger?: boolean; disabled?: boolean };

export type AccordionItemConfig = {
  id: string;
  avatar: string;
  hideAvatar?: boolean;
  chevronLast?: boolean;
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  keyValue?: { label: string; value: ReactNode; subValue?: ReactNode };
  details: { label: string; value: ReactNode; fullWidth?: boolean }[];
  actions?: AccordionAction[];
};

export function AccordionItem({ item, open, onToggle }: { item: AccordionItemConfig; open: boolean; onToggle: () => void }) {
  const panelId = `accordion-panel-${item.id}`;
  return (
    <article className="overflow-hidden rounded-lg border border-hairline bg-surface">
      <div className="flex min-h-[56px] items-center gap-2 p-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {!item.hideAvatar && (
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised text-sm font-semibold text-heading">
              {item.avatar || "?"}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-heading">{item.title}</span>
            {item.subtitle != null && <span className="block break-all text-xs text-muted">{item.subtitle}</span>}
          </span>
          {item.keyValue && (
            <span className="max-w-[6rem] shrink-0 text-right">
              <span className="block truncate text-xs font-semibold text-heading">{item.keyValue.value}</span>
              {item.keyValue.subValue != null && <span className="block truncate text-[10px] text-muted">{item.keyValue.subValue}</span>}
            </span>
          )}
          {item.badge && item.chevronLast && <span className="ml-auto shrink-0">{item.badge}</span>}
          <ChevronDown size={18} aria-hidden="true" className={clsx("shrink-0 text-muted transition-transform duration-200", open && "rotate-180")} />
        </button>
        {item.badge && !item.chevronLast && <div className="shrink-0">{item.badge}</div>}
      </div>
      <div className={clsx("grid grid-rows-[0fr] transition-[grid-template-rows] duration-200", open && "grid-rows-[1fr]")}>
        <div className="min-h-0 overflow-hidden">
          <div id={panelId} role="region" aria-label={`${item.title} details`} className="border-t border-hairline p-3">
            {item.details.length > 0 && (
              <dl className="grid grid-cols-2 gap-2">
                {item.details.map((detail, index) => (
                  <div key={`${detail.label}-${index}`} className={clsx("min-w-0 rounded-md bg-raised p-2", detail.fullWidth && "col-span-2")}>
                    <dt className="text-xs text-muted">{detail.label}</dt>
                    <dd className="mt-1 break-words text-sm font-semibold text-heading">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {item.actions && item.actions.length > 0 && (
              <div className="mt-3 flex gap-2">
                {item.actions.map((action) => "href" in action ? (
                  <Link key={action.label} href={action.href} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md border border-hairline px-3 text-sm font-medium text-heading hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    {action.label}
                  </Link>
                ) : (
                  <button key={action.label} type="button" disabled={action.disabled} onClick={action.onClick} className={clsx("inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md border px-3 text-sm font-medium disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", action.danger ? "border-danger text-danger hover:bg-danger/10" : "border-hairline text-heading hover:bg-surface-hover")}>
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
