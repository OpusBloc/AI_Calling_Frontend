"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Select } from "@/components/ui/controls";

export type SelectMenuOption = { value: string; label: string };

export default function SelectMenu({
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
  showNativeSelect = true,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  label: string;
  placeholder?: string;
  className?: string;
  /** Render the matching native select at md and above. */
  showNativeSelect?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuOptions = placeholder && !options.some((option) => option.value === "")
    ? [{ value: "", label: placeholder }, ...options]
    : options;
  const selected = menuOptions.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const openMenu = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    const below = rect ? window.innerHeight - rect.bottom : window.innerHeight;
    const above = rect?.top ?? 0;
    setOpenUpward(below < 260 && above > below);
    setActiveIndex(Math.max(0, menuOptions.findIndex((option) => option.value === value)));
    setOpen(true);
  };

  const choose = (option: SelectMenuOption) => {
    onChange(option.value);
    setActiveIndex(menuOptions.findIndex((item) => item.value === option.value));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (menuOptions.length === 0) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + direction + menuOptions.length) % menuOptions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = menuOptions[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const nativeSelect = (
    <Select
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className={clsx("hidden w-full min-w-0 dark:[color-scheme:dark] md:block", className)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </Select>
  );

  return (
    <div ref={rootRef} className={clsx("relative w-full min-w-0", className)}>
      <div className="md:hidden">
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => open ? setOpen(false) : openMenu()}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              openMenu();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          className="flex min-h-[44px] w-full min-w-0 items-center justify-between gap-2 rounded-md border border-hairline-strong bg-surface-input px-3 text-base text-heading outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)] dark:[color-scheme:dark]"
        >
          <span className="truncate">{selected?.label ?? placeholder ?? "Select an option"}</span>
          <ChevronDown size={18} aria-hidden="true" className={clsx("shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div
            role="listbox"
            aria-label={label}
            onKeyDown={handleListKeyDown}
            className={clsx("absolute left-0 right-0 z-30 max-h-60 overflow-y-auto rounded-lg border border-hairline bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900", openUpward ? "bottom-full mb-1" : "mt-1")}
          >
            {menuOptions.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={option.value === value}
                tabIndex={activeIndex === index ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={clsx(
                  "flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-left text-base text-heading hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--input-glow)] dark:hover:bg-slate-800",
                  option.value === value && "bg-blue-50 font-semibold dark:bg-slate-800",
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === value && <Check size={16} aria-hidden="true" className="shrink-0 text-blue-600 dark:text-blue-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {showNativeSelect && nativeSelect}
    </div>
  );
}
