"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AudioLines, ChevronRight, ClipboardList } from "lucide-react";

import { getAgentTestCalls } from "@/lib/callingAgentApi";
import { Badge, Drawer, EmptyState, ErrorState, errorMessage } from "@/components/ui";

type DataRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is DataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function recordList(data: unknown): DataRecord[] {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];

  for (const key of ["test_calls", "testCalls", "items", "calls", "records", "results"]) {
    if (Array.isArray(data[key])) return (data[key] as unknown[]).filter(isRecord);
  }
  if (Array.isArray(data.data)) return (data.data as unknown[]).filter(isRecord);
  if (isRecord(data.data)) return recordList(data.data);

  const recordKeys = ["id", "test_call_id", "call_id", "status", "transcript", "recording_url", "created_at"];
  if (recordKeys.some((key) => key in data)) return [data];

  const values = Object.values(data).filter(isRecord);
  return values.length ? values : [data];
}

function removeHiddenFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeHiddenFields);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !isHiddenDetailField(key)).map(([key, nested]) => [key, removeHiddenFields(nested)]));
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(removeHiddenFields(value), null, 2);
}

function displayLabel(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

const HIDDEN_DETAIL_FIELDS = new Set([
  "id",
  "agentid",
  "representativeid",
  "requestuuid",
  "plivocalluuid",
  "callbackat",
  "laststartedat",
  "lasterror",
  "createdat",
  "updatedat",
]);

function isHiddenDetailField(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return HIDDEN_DETAIL_FIELDS.has(normalized) || normalized.endsWith("id") || /(?:recording|audio).*(?:url|uri|path|href)/.test(normalized);
}

type TranscriptTurn = { role: "ai" | "user"; text: string };

function transcriptTurns(value: unknown, defaultRole: "ai" | "user" = "user"): TranscriptTurn[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed !== value) {
          const turns = transcriptTurns(parsed, defaultRole);
          if (turns.length) return turns;
        }
      } catch {
        // Treat non-JSON transcript strings as plain text below.
      }
    }
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    const parsedLines = lines.map((line) => {
      const match = line.match(/^(ai|assistant|agent|user|customer|caller)\s*:\s*(.*)$/i);
      if (!match) return null;
      return { role: /^(ai|assistant|agent)$/i.test(match[1]) ? "ai" as const : "user" as const, text: match[2] };
    });
    return parsedLines.every(Boolean) ? parsedLines as TranscriptTurn[] : [{ role: defaultRole, text: trimmed }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => transcriptTurns(item, defaultRole));
  }

  if (!isRecord(value)) return [];
  for (const key of ["messages", "turns", "segments", "items"]) {
    if (Array.isArray(value[key])) return transcriptTurns(value[key], defaultRole);
  }
  if (value.transcript !== undefined) {
    const nestedTurns = transcriptTurns(value.transcript, defaultRole);
    if (nestedTurns.length) return nestedTurns;
  }

  const text = value.content ?? value.text ?? value.message ?? value.utterance ?? value.transcript;
  const speaker = String(value.role ?? value.speaker ?? value.participant ?? value.author ?? "").toLowerCase();
  if (typeof text === "string") {
    return [{ role: /ai|assistant|agent|bot/.test(speaker) ? "ai" : /user|customer|caller|lead/.test(speaker) ? "user" : defaultRole, text }];
  }

  return Object.entries(value).flatMap(([speakerName, content]) => {
    if (["role", "speaker", "participant", "author"].includes(speakerName.toLowerCase())) return [];
    if (typeof content !== "string") return transcriptTurns(content);
    return [{ role: /ai|assistant|agent|bot/i.test(speakerName) ? "ai" as const : "user" as const, text: content }];
  });
}

function recordingUrl(value: unknown): string | null {
  if (typeof value === "string") return /^(https?:\/\/|\/|blob:|data:)/i.test(value) ? value : null;
  if (Array.isArray(value)) return value.map(recordingUrl).find(Boolean) ?? null;
  if (!isRecord(value)) return null;
  for (const [key, nested] of Object.entries(value)) {
    if (/url|path|href|file/i.test(key)) {
      const url = recordingUrl(nested);
      if (url) return url;
    }
  }
  for (const nested of Object.values(value)) {
    const url = recordingUrl(nested);
    if (url) return url;
  }
  return null;
}

function audioSource(record: unknown): string | null {
  if (Array.isArray(record)) return record.map(audioSource).find(Boolean) ?? null;
  if (!isRecord(record)) return null;
  for (const [key, value] of Object.entries(record)) {
    if (!/recording|audio/i.test(key)) continue;
    const url = recordingUrl(value);
    if (url) return url;
  }
  for (const value of Object.values(record)) {
    if (isRecord(value) || Array.isArray(value)) {
      const nestedUrl = audioSource(value);
      if (nestedUrl) return nestedUrl;
    }
  }
  return null;
}

function timestampValue(key: string, value: unknown) {
  if (!/(time|date|created|started|ended|completed|timestamp)/i.test(key) || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export default function AgentTestCallsDrawer({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const query = useQuery({
    queryKey: ["agent-test-calls", agentId],
    queryFn: () => getAgentTestCalls(agentId),
    retry: false,
  });
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const records = recordList(query.data);
  const selectedRecord = selectedIndex === null ? null : records[selectedIndex] ?? null;

  return (
    <Drawer title={selectedRecord ? `Test call ${selectedIndex! + 1}` : "Test call history"} description={selectedRecord ? "Details for this test call." : "Test calls made with this agent, including transcripts and recordings."} onClose={onClose} wide>
      {query.isLoading ? (
        <div className="space-y-3" aria-label="Loading test call records" aria-busy="true">
          {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-hairline bg-raised" />)}
        </div>
      ) : query.isError ? (
        <ErrorState title="Couldn't load test calls" message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      ) : selectedRecord ? (
        <div className="space-y-4">
          <button type="button" onClick={() => setSelectedIndex(null)} className="inline-flex h-9 items-center gap-2 rounded-md border border-hairline px-3 text-sm font-medium text-heading hover:bg-blue-50 dark:hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <ArrowLeft size={16} aria-hidden /> Back to test calls
          </button>
          <TestCallRecordDetails record={selectedRecord} index={selectedIndex!} />
        </div>
      ) : records.length === 0 ? (
        <EmptyState icon={<ClipboardList size={20} />} title="No test calls yet" text="Test calls made with this agent will appear here." />
      ) : (
        <div className="space-y-2">
          {records.map((record, index) => {
            const title = record.customer_name ?? record.name ?? `Test call ${index + 1}`;
            const phone = record.phone_number ?? record.phone ?? record.to ?? record.call_to;

            return (
              <button key={String(record.id ?? record.test_call_id ?? record.call_id ?? index)} type="button" onClick={() => setSelectedIndex(index)} className="flex w-full items-center gap-3 rounded-xl border border-hairline bg-surface p-4 text-left transition-colors hover:bg-blue-50 dark:hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-heading">{displayValue(title)}</span>
                  <span className="mt-1 block text-xs text-muted">{phone ? displayValue(phone) : `Test call ${index + 1}`}</span>
                </span>
                {typeof record.status === "string" && <Badge tone={record.status.toLowerCase() === "completed" ? "gain" : "neutral"}>{record.status}</Badge>}
                <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

function TestCallRecordDetails({ record, index }: { record: DataRecord; index: number }) {
  const customerName = typeof record.customer_name === "string" ? record.customer_name : null;
  const transcriptEntries = Object.entries(record).filter(([key]) => /transcript|conversation/i.test(key));
  const audioUrl = audioSource(record);
  const entries = Object.entries(record).filter(([key]) => key !== "customer_name" && !isHiddenDetailField(key) && !transcriptEntries.some(([transcriptKey]) => transcriptKey === key));

  return (
    <article className="space-y-4 rounded-xl border border-hairline bg-surface p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-heading">{customerName || `Test call ${index + 1}`}</h4>
        </div>
        {typeof record.status === "string" && <Badge tone={record.status.toLowerCase() === "completed" ? "gain" : "neutral"}>{record.status}</Badge>}
      </header>

      {entries.length > 0 && (
        <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-xs font-medium text-muted">{displayLabel(key)}</dt>
              <dd className="mt-1 break-words text-sm text-body">
                {timestampValue(key, value) ?? (typeof value === "object" && value !== null ? <pre className="whitespace-pre-wrap break-words font-sans text-xs">{displayValue(value)}</pre> : displayValue(value))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {audioUrl && (
        <div className="space-y-2">
          <h5 className="flex items-center gap-2 text-xs font-medium text-muted"><AudioLines size={14} /> Recording</h5>
          <audio className="w-full" controls preload="none" src={audioUrl}>Your browser does not support audio playback.</audio>
        </div>
      )}

      {transcriptEntries.map(([key, value]) => (
        <section key={key} className="space-y-1.5">
          <h5 className="text-xs font-medium text-muted">{displayLabel(key)}</h5>
          <div className="max-h-96 space-y-3 overflow-auto rounded-lg bg-raised p-3">
            {transcriptTurns(value, /ai|assistant|agent/i.test(key) ? "ai" : "user").length === 0 ? (
              <pre className="whitespace-pre-wrap break-words text-sm text-body">{displayValue(value)}</pre>
            ) : transcriptTurns(value, /ai|assistant|agent/i.test(key) ? "ai" : "user").map((turn, turnIndex) => (
              <div key={`${turn.role}-${turnIndex}`} className={`flex ${turn.role === "ai" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 ${turn.role === "ai" ? "bg-surface text-body" : "bg-blue-100 text-heading dark:bg-primary-soft dark:text-primary-soft-text"}`}>
                  <p className="mb-1 text-[11px] font-semibold text-muted">{turn.role === "ai" ? "AI" : "User"}</p>
                  <p className="whitespace-pre-wrap break-words text-sm">{turn.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
