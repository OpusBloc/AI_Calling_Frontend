"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";

export type SelectOption = { value: string; label: string };

type Size = "sm" | "md";

const SIZES: Record<Size, string> = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
};

/**
 * Listbox that replaces the native `<select>`.
 *
 * A native select can be styled while closed, but its open option list is drawn
 * by the operating system and cannot be themed at all — so it always breaks out
 * of the design system. This renders its own list instead.
 *
 * The list is portalled to `document.body` and positioned from the trigger's
 * bounding box. That matters because these sit inside cards with
 * `overflow-hidden` and tables with `overflow-x-auto`, which would otherwise
 * clip an absolutely-positioned popover.
 */
export function Select({
  value,
  onChange,
  options,
  size = "sm",
  bare = false,
  className,
  placeholder = "Select…",
  disabled = false,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<SelectOption>;
  size?: Size;
  /** Drops the trigger's own border and fill, for use inside a control that
   *  already draws them. A `border-0`/`bg-transparent` passed via className
   *  would collide with the base utilities, and Tailwind resolves that by
   *  stylesheet order rather than prop order. */
  bare?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const estimated = Math.min(options.length * 34 + 8, 260);
    // Flip above the trigger when there is not enough room beneath it.
    const openUp = below < estimated && r.top > below;
    setBox({
      top: openUp ? r.top - estimated - 4 : r.bottom + 4,
      left: r.left,
      width: r.width,
    });
  }, [options.length]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    // `true` catches scrolling of any ancestor, not just the window.
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
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  };

  const commit = (v: string) => {
    onChange(v);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[activeIndex]) commit(options[activeIndex].value);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
        }}
        onKeyDown={onKeyDown}
        className={clsx(
          "inline-flex w-full items-center justify-between gap-2 rounded-md px-3",
          "font-medium transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60",
          bare
            ? open
              ? "text-heading"
              : "text-body"
            : [
                "border bg-surface-input",
                open
                  ? "border-accent text-heading"
                  : "border-hairline text-body hover:border-hairline-strong",
              ],
          SIZES[size],
          className,
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={clsx(
            "size-3.5 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </button>

      {mounted && open && box
        ? createPortal(
            <div
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              onKeyDown={onKeyDown}
              style={{
                position: "fixed",
                top: box.top,
                left: box.left,
                minWidth: box.width,
                zIndex: 10050,
              }}
              className="max-h-[260px] overflow-y-auto rounded-md border border-hairline bg-surface py-1 shadow-lg"
            >
              {options.map((o, i) => {
                const isSelected = o.value === value;
                const isActive = i === activeIndex;
                return (
                  <div
                    key={o.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(o.value)}
                    className={clsx(
                      "flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-xs whitespace-nowrap",
                      isActive ? "bg-surface-hover" : "",
                      isSelected ? "font-semibold text-accent-text" : "text-body",
                    )}
                  >
                    {o.label}
                    {isSelected && (
                      <Check className="size-3.5 shrink-0" strokeWidth={2} />
                    )}
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
