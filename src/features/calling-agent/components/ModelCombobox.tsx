
"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

type Props = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function ModelCombobox({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Select or type a model",
}: Props) {
  const [open, setOpen] = useState(false);

  const filtered = options.filter((model) =>
    model.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
className="
  w-full rounded-lg
  border border-[var(--hairline-strong)]
  bg-[var(--surface-input)]
  px-4 py-3 pr-10
  text-sm text-heading
  outline-none transition-all duration-200
  focus:border-[var(--input-glow)]
  focus:ring-2 focus:ring-blue-500/20
  focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-50
"
        />

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--input-glow)]"
        >
          <ChevronDown size={17} />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-[9999] mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[var(--hairline-strong)] bg-surface shadow-xl">
          {filtered.map((model) => (
            <button
              key={model}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(model);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-heading hover:bg-surface-hover"
            >
              {model}
              {value === model && (
                <Check size={15} className="text-[var(--input-glow)]" />
              )}
            </button>
          ))}

          {filtered.length === 0 && value.trim() && (
            <div className="px-4 py-3 text-xs text-muted">
              Custom model: {value}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
