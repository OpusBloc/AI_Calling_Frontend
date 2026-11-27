"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { AccordionItemConfig } from "./AccordionItem";
import { AccordionItem } from "./AccordionItem";

export function AccordionList({ items, empty, loading = false, dense = false }: { items: AccordionItemConfig[]; empty?: ReactNode; loading?: boolean; dense?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const listId = useId();
  if (items.length === 0) return (
    <div className="md:hidden">
      {loading ? (
        <div className="space-y-2" aria-label="Loading rows" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex min-h-[72px] animate-pulse items-center gap-3 rounded-lg border border-hairline bg-surface p-3"><span className="size-10 rounded-full bg-raised" /><span className="flex-1 space-y-2"><span className="block h-4 w-2/3 rounded bg-raised" /><span className="block h-3 w-1/3 rounded bg-raised" /></span></div>)}
        </div>
      ) : empty}
    </div>
  );
  return (
    <div className={`${dense ? "space-y-1" : "space-y-2"} md:hidden`}>
      {items.map((item) => (
        <AccordionItem key={item.id} item={{ ...item, id: `${listId}-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}` }} open={openId === item.id} onToggle={() => setOpenId((current) => current === item.id ? null : item.id)} />
      ))}
    </div>
  );
}
