"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { FileText, PenLine, Upload } from "lucide-react";

import { isPartFilled, readTextFile, UPLOAD_EXTENSIONS, type PartDraft } from "@/lib/agentDraft";
import type { AgentPart } from "@/lib/callingAgentApi";
import { Button, ErrorBanner, TextArea, errorMessage } from "@/components/ui";
import { PART_META } from "./agentEditorConstants";
/* ------------------------------- Part editor ------------------------------ */

export default function AgentPartEditor({
  part,
  value,
  savedText,
  onChange,
}: {
  part: AgentPart;
  value: PartDraft;
  savedText: string | null;
  onChange: (value: PartDraft) => void;
}) {
  const meta = PART_META[part];
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const mode = value.source;
  const hasFile = mode === "file" && !!value.fileName;

  const switchMode = async (next: "text" | "file") => {
    if (next === mode) return;
    setFileError(null);
    if (next === "text") {
      // Keep a loaded file's contents so it can be edited as text
      onChange({ source: "text", text: value.text });
    } else {
      // Switched to upload; clear text if it wasn't from a file
      onChange({ source: "file", text: "" });
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setFileError(null);
    try {
      const text = await readTextFile(file);
      onChange({ source: "file", text, fileName: file.name });
    } catch (err) {
      setFileError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-heading">
            {meta.label}{" "}
            {part === "extra" && (
              <span className="text-sm font-normal text-faint">optional</span>
            )}
          </h3>
          <p className="mt-0.5 text-sm text-muted">{meta.description}</p>
        </div>
        <div className="inline-flex rounded-md border border-hairline bg-surface p-0.5 text-xs">
          <button
            type="button"
            onClick={() => switchMode("text")}
            className={clsx(
              "flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors",
              mode === "text"
                ? "bg-accent text-on-accent shadow-xs"
                : "text-muted hover:text-heading",
            )}
          >
            <PenLine size={13} /> Type text
          </button>
          <button
            type="button"
            onClick={() => switchMode("file")}
            className={clsx(
              "flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors",
              mode === "file"
                ? "bg-accent text-on-accent shadow-xs"
                : "text-muted hover:text-heading",
            )}
          >
            <Upload size={13} /> Upload file
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <TextArea
          rows={14}
          value={value.text}
          onChange={(e) => onChange({ source: "text", text: e.target.value })}
          placeholder={meta.placeholder}
        />
      ) : hasFile ? (
        <div className="rounded-md border border-hairline bg-surface">
          <div className="flex items-center justify-between border-b border-hairline px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-heading">
              <FileText size={14} className="text-accent-text" />{" "}
              {value.fileName}
              <span className="text-muted">
                {value.text.length.toLocaleString()} chars
              </span>
            </span>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button
                variant="ghost"
                onClick={() => onChange({ source: "file", text: "" })}
              >
                Remove
              </Button>
            </div>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[13px] text-body">
            {value.text}
          </pre>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className={clsx(
            "flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-accent bg-accent-bg"
              : "border-hairline-strong hover:bg-surface-hover",
          )}
        >
          <Upload size={22} className="text-muted" />
          <span className="text-sm font-medium text-heading">
            Drop a file here or click to browse
          </span>
          <span className="text-xs text-muted">
            .txt or .md, UTF-8, up to 1 MB
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <ErrorBanner message={fileError} />

      {savedText !== null && savedText && !isPartFilled(value) && (
        <p className="text-xs text-warn">
          Left empty, this section keeps its current saved text.
        </p>
      )}
    </div>
  );
}

