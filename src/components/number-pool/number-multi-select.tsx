"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import type { PlivoNumber } from "@/types/types";

type Props = {
  options: PlivoNumber[];
  selected: string[];
  onChange: (next: string[]) => void;
  isLoading?: boolean;
  maxSelections?: number;
};

type DropdownPosition = { top: number; left: number; width: number; maxHeight: number };

export function NumberMultiSelect({ options, selected, onChange, isLoading, maxSelections }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !dropdownRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const el = ref.current;
      const rect = el?.getBoundingClientRect();
      if (!el || !rect) return;
      const margin = 8;
      const footer = el.closest("[data-pool-modal]")?.querySelector("[data-pool-modal-footer]");
      const footerTop = footer?.getBoundingClientRect().top ?? window.innerHeight;
      const availableBelow = Math.min(window.innerHeight - rect.bottom - margin, footerTop - rect.bottom - margin);
      const maxHeight = Math.max(0, Math.min(280, availableBelow));
      setPosition({
        left: Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin)),
        width: Math.min(rect.width, window.innerWidth - margin * 2),
        top: rect.bottom + 4,
        maxHeight,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((number) =>
      number.phone_e164.toLowerCase().includes(query) || (number.alias ?? "").toLowerCase().includes(query),
    );
  }, [options, search]);

  const toggle = (phone: string) =>
    onChange(selected.includes(phone) ? selected.filter((item) => item !== phone) : [...selected, phone]);

  const dropdown = open && mounted && position ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[60] overflow-hidden rounded-md border border-hairline-strong bg-surface-input text-heading shadow-xl"
      style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
    >
      <div className="overflow-y-auto" style={{ maxHeight: position.maxHeight }}>
        {isLoading && <p className="p-3 text-sm text-muted">Loading numbers...</p>}
        {!isLoading && filtered.length === 0 && <p className="p-3 text-sm text-muted">No numbers found</p>}
        {!isLoading && filtered.map((number) => (
          <label
            key={number.phone_e164}
            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              !selected.includes(number.phone_e164) && maxSelections !== undefined && selected.length >= maxSelections
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-accent-bg"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(number.phone_e164)}
              disabled={!selected.includes(number.phone_e164) && maxSelections !== undefined && selected.length >= maxSelections}
              onChange={() => toggle(number.phone_e164)}
              className="accent-accent"
            />
            <span className="min-w-0 break-all text-black dark:text-heading">{number.phone_e164}</span>
            {number.alias && <span className="truncate text-muted">({number.alias})</span>}
          </label>
        ))}
        {selected.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-between border-t border-hairline-strong bg-surface-input px-3 py-2 text-xs text-muted">
            <span>{selected.length} selected</span>
            <button type="button" onClick={() => onChange([])} className="text-loss hover:underline">
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div ref={ref} className="relative mt-1 w-full min-w-0 rounded-md border border-hairline-strong bg-surface-input px-3 py-2 text-heading transition-colors hover:border-accent-strong focus-within:border-accent-strong">
        <div className="flex min-h-7 flex-wrap items-center gap-1.5">
          {selected.map((phone) => (
            <span key={phone} className="flex max-w-full items-center gap-1 rounded-full bg-chip px-2 py-1 text-xs font-medium text-body">
              <span className="break-all text-black dark:text-heading">{phone}</span>
              <button
                type="button"
                aria-label={`Remove ${phone}`}
                onClick={() => onChange(selected.filter((item) => item !== phone))}
                className="shrink-0 rounded-full hover:bg-accent/30"
              >
                <X size={13} />
              </button>
            </span>
          ))}
          <div className="flex min-w-[9rem] flex-1 items-center gap-2 px-1">
            {!selected.length && !search && <Search size={15} className="shrink-0 text-muted" />}
            <input
              value={search}
              onFocus={() => setOpen(true)}
              onChange={(event) => { setSearch(event.target.value); setOpen(true); }}
              onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
              placeholder={!selected.length && !search ? "Search and select numbers" : ""}
              aria-label="Search phone numbers"
              aria-expanded={open}
              style={{ border: "none", outline: "none", boxShadow: "none" }}
              className="w-full min-w-0 border-0 bg-transparent py-1 text-sm text-heading outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:text-muted"
            />
          </div>
        </div>
      </div>
      {dropdown}
    </>
  );
}
