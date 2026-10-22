"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import clsx from "clsx";

export type SearchableOption = {
  value: string;
  label: string;
  /** Secondary text (e.g. a public id) — shown dimmed and also searched. */
  sublabel?: string;
  /** Options sharing a group render under one heading, in first-seen order. */
  group?: string;
};

/**
 * Dropdown with a search box, for long lists (e.g. every channel partner)
 * where scrolling a native <select> stops working. Typing filters on label and
 * sublabel; arrows + Enter pick; Escape closes.
 *
 * Like `Select`, the list is portalled to <body> and positioned from the
 * trigger, so cards with `overflow-hidden` can't clip it. The trigger takes the
 * caller's `className`, so it can wear the same input styling as the
 * neighbouring native fields in a form.
 */
export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  emptyOptionLabel,
  searchPlaceholder = "Search…",
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SearchableOption>;
  /** Trigger text when nothing is selected and there is no empty option. */
  placeholder?: string;
  /** Adds a selectable "" option at the top (e.g. "All partners"). */
  emptyOptionLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
    openUp: boolean;
  } | null>(null);

  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setMounted(true), []);

  const allOptions = useMemo<SearchableOption[]>(
    () =>
      emptyOptionLabel !== undefined
        ? [{ value: "", label: emptyOptionLabel }, ...options]
        : [...options],
    [options, emptyOptionLabel],
  );

  const selected = allOptions.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter(
      (o) =>
        o.value !== "" &&
        `${o.label} ${o.sublabel ?? ""}`.toLowerCase().includes(q),
    );
  }, [allOptions, query]);

  const PANEL_H = 320;

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const openUp = below < PANEL_H && r.top > below;
    setBox({
      top: openUp ? r.top - 4 : r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 260),
      openUp,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus the search box as the panel opens.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Keep the highlighted row in view while arrowing.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const openPanel = () => {
    if (disabled) return;
    setQuery("");
    setActiveIndex(Math.max(0, allOptions.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const commit = (v: string) => {
    onChange(v);
    close();
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[activeIndex]) commit(filtered[activeIndex].value);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  let lastGroup: string | undefined;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            openPanel();
          }
        }}
        className={clsx(
          "flex w-full items-center justify-between gap-2 text-left",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <span className={clsx("truncate", !selected && "text-muted")}>
          {selected ? (
            <>
              {selected.label}
              {selected.sublabel ? (
                <span className="text-muted"> · {selected.sublabel}</span>
              ) : null}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown
          className={clsx(
            "size-3.5 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {mounted && open && box
        ? createPortal(
            <div
              ref={panelRef}
              style={{
                position: "fixed",
                left: box.left,
                width: box.width,
                zIndex: 10050,
                ...(box.openUp
                  ? { bottom: window.innerHeight - box.top }
                  : { top: box.top }),
              }}
              className="flex max-h-[320px] flex-col overflow-hidden rounded-md border border-hairline bg-surface shadow-lg"
            >
              <div className="relative border-b border-hairline p-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-8 w-full rounded border border-hairline bg-surface-input pl-7 pr-2 text-xs text-heading outline-none placeholder:text-faint focus:border-accent"
                />
              </div>

              <ul id={listboxId} ref={listRef} role="listbox" className="flex-1 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-muted">
                    No matches for “{query.trim()}”
                  </li>
                ) : (
                  filtered.map((o, i) => {
                    const heading =
                      o.group && o.group !== lastGroup ? o.group : null;
                    lastGroup = o.group;
                    const isSelected = o.value === value;
                    return (
                      <li key={`${o.value}-${i}`} role="presentation">
                        {heading ? (
                          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-faint">
                            {heading}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          data-index={i}
                          onMouseEnter={() => setActiveIndex(i)}
                          onClick={() => commit(o.value)}
                          className={clsx(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs",
                            i === activeIndex ? "bg-surface-hover" : "",
                            isSelected ? "font-semibold text-heading" : "text-body",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {o.label}
                            {o.sublabel ? (
                              <span className="ml-1.5 font-normal text-muted">
                                {o.sublabel}
                              </span>
                            ) : null}
                          </span>
                          {isSelected ? (
                            <Check className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
