"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type MultiSelectOption = { id: string; label: string; detail?: string };

/**
 * Searchable checkbox dropdown with the chosen items shown as removable chips
 */
export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  hint,
  error,
  required,
  loading,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  hint?: string;
  /** Shown in place of the hint */
  error?: string | null;
  required?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLFieldSetElement>(null);
  const listId = useId();
  const term = search.trim().toLowerCase();
  const filtered = options.filter((o) => `${o.label} ${o.detail ?? ""}`.toLowerCase().includes(term));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <fieldset ref={ref} className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium text-heading">
        {label}
        {required && (
          <span className="ml-0.5 text-loss" aria-hidden>
            *
          </span>
        )}
        <span className="tnum ml-2 text-xs font-normal text-muted">{selected.length} selected</span>
      </legend>

      <div className="relative">
        <div className="glow-field flex h-10 items-center gap-2 rounded-md border border-hairline-strong bg-surface-input px-3 transition-colors hover:border-accent-strong focus-within:border-accent">
          <Search size={15} aria-hidden className="shrink-0 text-muted" />
          <input
            value={search}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              // Close just the list; don't let Escape also close the drawer around it
              if (e.key === "Escape" && open) {
                e.stopPropagation();
                setOpen(false);
              }
            }}
            placeholder={loading ? "Loading…" : `Search ${label.toLowerCase()}…`}
            aria-label={`Search ${label}`}
            aria-controls={listId}
            className="min-w-0 flex-1 bg-transparent text-sm text-heading outline-none placeholder:text-faint focus-visible:outline-none"
            style={{ outline: "none" }}
          />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={`${open ? "Close" : "Open"} ${label} list`}
            aria-expanded={open}
            className="-mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          >
            <ChevronDown size={16} className={clsx("transition-transform", open && "rotate-180")} />
          </button>
        </div>

        {open && (
          <div
            id={listId}
            className="animate-fade-in absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-hairline-strong bg-surface p-1 shadow-md"
          >
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted">
                {options.length === 0 ? `No ${label.toLowerCase()} available yet.` : "No matches."}
              </p>
            ) : (
              filtered.map((o) => {
                const checked = selected.includes(o.id);
                return (
                  <label
                    key={o.id}
                    className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-surface-hover"
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.id)} className="sr-only" />
                    <span
                      aria-hidden
                      className={clsx(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked ? "border-accent bg-accent text-on-accent" : "border-hairline-strong",
                      )}
                    >
                      {checked && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-heading">{o.label}</span>
                    {o.detail && <span className="tnum shrink-0 text-xs text-muted">{o.detail}</span>}
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const option = options.find((o) => o.id === id);
            return (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-chip py-0.5 pl-2.5 pr-1 text-xs text-body"
              >
                <span className="truncate">{option?.label ?? id}</span>
                <button
                  type="button"
                  aria-label={`Remove ${option?.label ?? id}`}
                  onClick={() => toggle(id)}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover hover:text-heading"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-loss">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </fieldset>
  );
}
