// src/components/calling-agent/ClassificationCallsDrawer.tsx
"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import clsx from "clsx";

import { Drawer, Button, formatDuration, formatDate } from "@/components/ui";
import { useClassificationCalls, useUnclassifiedCalls } from "@/hooks/hooks";
import type { ClassificationCall } from "@/lib/callingAgentApi";

interface ClassificationCallsDrawerProps {
  agentId: string;
  classificationId?: string | null;
  title: string;
  onClose: () => void;
}

export default function ClassificationCallsDrawer({
  agentId,
  classificationId,
  title,
  onClose,
}: ClassificationCallsDrawerProps) {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const isUnclassified = !classificationId;
  const classCalls = useClassificationCalls(
    agentId,
    classificationId ?? "",
    { page, page_size: pageSize }
  );
  const unclassCalls = useUnclassifiedCalls(
    agentId,
    { page, page_size: pageSize }
  );

  const query = isUnclassified ? unclassCalls : classCalls;
  const calls: ClassificationCall[] = query.data?.calls ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const transcriptEntries = (transcript: unknown): Array<{ role: string; content: string }> => {
    let value = transcript;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        return value.trim() ? [{ role: "Transcript", content: value }] : [];
      }
    }

    if (typeof value === "string") return value.trim() ? [{ role: "Transcript", content: value }] : [];
    const entries = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
    return entries.flatMap((entry) => {
      if (typeof entry === "string") return [{ role: "user", content: entry }];
      if (!entry || typeof entry !== "object") return [];

      const line = entry as Record<string, unknown>;
      const rawContent = line.content ?? line.text ?? line.message;
      const content =
        typeof rawContent === "string"
          ? rawContent
          : rawContent == null
            ? ""
            : JSON.stringify(rawContent);
      if (!content) return [];
      const role = line.role ?? line.speaker ?? line.name ?? "user";
      return [{ role: String(role), content }];
    });
  };

  return (
    <Drawer
      title={title}
      description={`${total} total call${total === 1 ? "" : "s"} classified here.`}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {query.isLoading && (
          <div className="py-12 text-center text-sm text-muted">Loading calls…</div>
        )}

        {query.isError && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {query.error.message}
          </div>
        )}

        {!query.isLoading && !query.isError && calls.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#e6dcc3] py-12 text-center text-sm text-muted">
            No calls found in this category yet.
          </div>
        )}

        {calls.map((call) => (
          <div
            key={call.call_uuid ?? call.attempt_id ?? Math.random().toString()}
            className="rounded-xl border border-[#e6dcc3] bg-[#fdfbf6] p-4 text-sm space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#efe7d2] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1b1b2f]">
                  {call.name ? `${call.name} (${call.phone ?? "Unknown"})` : (call.phone ?? "Unknown number")}
                </span>
                {call.status && (
                  <span className="rounded-full bg-[#f1eadb] px-2 py-0.5 text-[11px] font-medium text-[#6b6450]">
                    {call.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#8f8566]">
                {call.duration_seconds !== null && call.duration_seconds !== undefined && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {formatDuration(call.duration_seconds)}
                  </span>
                )}
                <span>{call.classified_at ? formatDate(call.classified_at) : call.ended_at ? formatDate(call.ended_at) : "—"}</span>
              </div>
            </div>

            {call.reason && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#8f7a3c]">Sorting Reason</p>
                <p className="mt-0.5 text-[#1b1b2f] bg-[#fbf8f0] rounded-lg p-2.5 border border-[#efe7d2] text-xs leading-relaxed">
                  {call.reason}
                </p>
              </div>
            )}

            {call.audio && (
              <div className="flex items-center gap-3 pt-1">
                <audio controls src={call.audio} className="h-8 w-full max-w-sm rounded" preload="none">
                  Your browser does not support audio.
                </audio>
              </div>
            )}

            {call.transcript != null && (
              <details className="group pt-1">
                <summary className="cursor-pointer text-xs font-medium text-[#8f7a3c] hover:text-[#1b1b2f]">
                  View Transcript
                </summary>
                <ol
                  aria-label="Call transcript"
                  className="mt-2 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-[#efe7d2] bg-[#fbf8f0] p-3"
                >
                  {transcriptEntries(call.transcript).map((line, index) => {
                    const agent = ["assistant", "agent"].includes(line.role.toLowerCase());
                    return (
                      <li key={index} className={clsx("flex", agent ? "justify-start" : "justify-end")}>
                        <div
                          className={clsx(
                            "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed",
                            agent ? "bg-white text-[#1b1b2f]" : "bg-[#eee4c9] text-[#1b1b2f]",
                          )}
                        >
                          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-[#8f8566]">
                            {agent ? "Agent" : line.role.toLowerCase() === "user" ? "User" : line.role}
                          </span>
                          {line.content}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </details>
            )}
          </div>
        ))}

        {pageCount > 1 && (
          <div className="flex items-center justify-between pt-4 text-xs text-[#8f8566]">
            <span>
              Page {page} of {pageCount} ({total} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
