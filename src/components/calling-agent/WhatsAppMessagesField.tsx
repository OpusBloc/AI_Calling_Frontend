// src/components/calling-agent/WhatsAppMessagesField.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";

import { useWhatsAppMessages } from "@/hooks/hooks";

interface WhatsAppMessagesFieldProps {
  value: string[];
  onChange: (ids: string[]) => void;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function WhatsAppMessagesField({ value, onChange }: WhatsAppMessagesFieldProps) {
  const { data, isLoading, isError, refetch } = useWhatsAppMessages();
  const templates = data ?? [];
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const handleAddCustom = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    // Pressing Enter on text that matches a template's ID or template_id selects that template
    const match = templates.find((t) => t.id === trimmed || t.template_id === trimmed);
    const id = match?.id ?? trimmed;
    if (!match && !UUID_RE.test(id)) {
      setInputError("Enter a valid message UUID, or pick a template from the list.");
      return;
    }
    if (!value.includes(id)) onChange([...value, id]);
    setInputVal("");
    setInputError(null);
    setOpen(false);
  };

  const q = inputVal.trim().toLowerCase();
  const filtered = templates.filter(
    (t) =>
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.template_id.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q),
  );

  const labelFor = (id: string) => {
    const t = templates.find((x) => x.id === id);
    return t?.template_id ?? id;
  };

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-heading">WhatsApp Messages</label>
        <span className="tnum text-xs text-muted">{value.length} selected</span>
      </div>

      <div className="relative">
        <div className="glow-field flex h-10 items-center gap-2 rounded-md border border-hairline-strong bg-surface-input px-3 transition-colors hover:border-accent-strong focus-within:border-accent">
          <Search size={15} aria-hidden className="shrink-0 text-muted" />
          <input
            value={inputVal}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setInputVal(e.target.value);
              setInputError(null);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              } else if (e.key === "Escape" && open) {
                setOpen(false);
              }
            }}
            placeholder={isLoading ? "Loading message templates…" : "Search by template, text, or paste a message UUID…"}
            className="min-w-0 flex-1 bg-transparent text-sm text-heading outline-none placeholder:text-faint focus-visible:outline-none"
          />
          {inputVal.trim() && (
            <button
              type="button"
              onClick={handleAddCustom}
              className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs font-medium text-on-accent"
              title="Add this ID"
            >
              <Plus size={12} /> Add
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle WhatsApp message list"
            className="-mr-1.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted hover:bg-surface-hover hover:text-heading"
          >
            <ChevronDown size={16} className={clsx("transition-transform", open && "rotate-180")} />
          </button>
        </div>

        {open && (
          <div className="animate-fade-in absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-hairline-strong bg-surface p-1 shadow-md">
            {isError ? (
              <div className="flex items-center justify-between px-3 py-2 text-xs text-loss">
                <span>Couldn&apos;t load templates.</span>
                <button type="button" onClick={() => refetch()} className="font-medium underline">
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted">
                {q ? "No matching template. Press Enter to add it as a UUID." : "No WhatsApp messages have been created yet."}
              </div>
            ) : (
              filtered.map((t) => {
                const checked = value.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded px-2.5 py-1.5 text-sm hover:bg-surface-hover"
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggle(t.id)} className="sr-only" />
                    <span
                      aria-hidden
                      className={clsx(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked ? "border-accent bg-accent text-on-accent" : "border-hairline-strong",
                      )}
                    >
                      {checked && <Check size={12} strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-heading">{t.template_id}</span>
                      <p className="truncate text-xs text-muted">{t.content}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>

      {inputError && <p role="alert" className="text-xs text-loss">{inputError}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((id) => (
            <span
              key={id}
              title={templates.find((t) => t.id === id)?.content ?? id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-hairline bg-chip py-0.5 pl-2.5 pr-1 text-xs text-body"
            >
              <span className="truncate">{labelFor(id)}</span>
              <button
                type="button"
                aria-label={`Remove ${labelFor(id)}`}
                onClick={() => toggle(id)}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-loss"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        Select message templates to be sent via WhatsApp after or during calls.
      </p>
    </div>
  );
}