"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CloudUpload, Download, FileSpreadsheet, Loader2, X } from "lucide-react";

import { createCampaign, updateCampaign } from "@/lib/api";
import type { Campaign, CampaignCreate, CampaignUpdate, Weekday } from "@/types/types";
import { useAgents, usePlivoPools, useRepresentatives } from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import MultiSelect from "@/components/MultiSelect";
import { WEEKDAYS, formatDays } from "@/features/campaigns/components/CampaignsTab";
import { Button, Card, Field, FormPage, Select, TextInput, humanize } from "@/components/ui";

export const CAMPAIGN_STATUSES: Campaign["status"][] = ["draft", "scheduled", "running", "paused", "completed", "cancelled"];
const RETRY_CONDITIONS = ["no_answer", "not_connected", "busy", "failed"] as const;
const CAMPAIGN_STEPS = [
  { id: "details", label: "Details & Leads" },
  { id: "calling", label: "Calling & Retries" },
  { id: "timing", label: "Timing" },
] as const;
type CampaignStep = (typeof CAMPAIGN_STEPS)[number]["id"];

// Same header names the backend accepts
const PHONE_HEADERS = ["phone", "phone_number", "phone_e164", "mobile", "mobile_number", "number"];
const NAME_HEADERS = ["name", "full_name", "lead_name"];

const toDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toIsoDateTime = (value: string) => (value ? new Date(value).toISOString() : null);

const intBetween = (
  value: string | number | null | undefined,
  min: number,
  max = Infinity
) => {
  const safeValue = String(value ?? "").trim();

  if (!safeValue) return false;

  const n = Number(safeValue);

  return Number.isInteger(n) && n >= min && n <= max;
};

type LeadPreview = { phone: string; name: string };
type SheetCheck = { total: number; valid: number; duplicates: number; invalid: number; preview: LeadPreview[] } | { error: string } | null;

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

function inspectLeadRows(rows: string[][]): SheetCheck {
  if (!rows.length) return { error: "This file is empty." };
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const phoneIndex = headers.findIndex((header) => PHONE_HEADERS.includes(header));
  const nameIndex = headers.findIndex((header) => NAME_HEADERS.includes(header));
  if (phoneIndex < 0) return { error: `The first row needs a phone column (${PHONE_HEADERS.slice(0, 3).join(", ")}…).` };
  const leads = rows.slice(1).filter((lead) => lead.some((value) => value.trim()));
  if (!leads.length) return { error: "The file has a header row but no leads." };
  const seen = new Set<string>();
  let valid = 0;
  let duplicates = 0;
  let invalid = 0;
  const preview: LeadPreview[] = [];
  for (const lead of leads) {
    const phone = (lead[phoneIndex] ?? "").trim();
    const name = nameIndex >= 0 ? (lead[nameIndex] ?? "").trim() : "";
    if (preview.length < 5) preview.push({ phone, name });
    let normalized = phone.replace(/[\s().-]/g, "");
    if (/^\d{10}$/.test(normalized)) normalized = `+91${normalized}`;
    else if (/^00\d+$/.test(normalized)) normalized = `+${normalized.slice(2)}`;
    if (!/^\+?[1-9]\d{9,14}$/.test(normalized)) { invalid += 1; continue; }
    if (seen.has(normalized)) { duplicates += 1; continue; }
    seen.add(normalized);
    valid += 1;
  }
  return { total: leads.length, valid, duplicates, invalid, preview };
}

async function unzipText(data: Uint8Array, filename: string): Promise<string | null> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let end = -1;
  for (let i = Math.max(0, data.length - 65_557); i <= data.length - 22; i += 1) if (view.getUint32(i, true) === 0x06054b50) end = i;
  if (end < 0) return null;
  const entries = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) return null;
    const method = view.getUint16(cursor + 10, true);
    const size = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder().decode(data.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name === filename) {
      const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
      const bytes = data.slice(start, start + size);
      if (method === 0) return new TextDecoder().decode(bytes);
      if (method !== 8 || typeof DecompressionStream === "undefined") return null;
      const raw = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      return await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat))).text();
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

async function checkSheet(file: File): Promise<SheetCheck> {
  if (file.size > 10 * 1024 * 1024) return { error: "Choose a file smaller than 10 MB." };
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "csv") return inspectLeadRows(parseCsvRows((await file.text()).replace(/^\uFEFF/, "")));
  if (ext === "xml") {
    const document = new DOMParser().parseFromString(await file.text(), "application/xml");
    if (document.querySelector("parsererror")) return { error: "This XML file could not be read." };
    const records = [...document.querySelectorAll("lead, row, record")];
    const rows = records.map((record) => [
      record.querySelector("phone, phone_number, phone_e164, mobile, mobile_number, number")?.textContent?.trim() ?? "",
      record.querySelector("name, full_name, lead_name")?.textContent?.trim() ?? "",
    ]);
    return inspectLeadRows([["phone", "name"], ...rows]);
  }
  if (ext === "xlsx") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const xml = await unzipText(bytes, "xl/worksheets/sheet1.xml");
    if (!xml) return { error: "This Excel file could not be previewed. Save it as CSV and try again." };
    const sharedXml = await unzipText(bytes, "xl/sharedStrings.xml");
    const sharedDoc = sharedXml ? new DOMParser().parseFromString(sharedXml, "application/xml") : null;
    const shared = sharedDoc ? [...sharedDoc.querySelectorAll("si")].map((item) => [...item.querySelectorAll("t")].map((node) => node.textContent ?? "").join("")) : [];
    const sheetDoc = new DOMParser().parseFromString(xml, "application/xml");
    const rows = [...sheetDoc.querySelectorAll("sheetData row")].map((row) => {
      const values: string[] = [];
      for (const cell of [...row.querySelectorAll("c")]) {
        const ref = cell.getAttribute("r") ?? "A1";
        const letters = ref.match(/^[A-Z]+/)?.[0] ?? "A";
        const column = [...letters].reduce((number, letter) => number * 26 + letter.charCodeAt(0) - 64, 0) - 1;
        const value = cell.querySelector("v")?.textContent ?? cell.querySelector("is t")?.textContent ?? "";
        values[column] = cell.getAttribute("t") === "s" ? shared[Number(value)] ?? "" : value;
      }
      return Array.from({ length: values.length }, (_, index) => values[index] ?? "");
    });
    return inspectLeadRows(rows);
  }
  return { error: "Upload a CSV, Excel, or XML file." };
}

function Panel({ title, description, children }: { title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card title={title} description={description}>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function LeadPreviewTable({ rows }: { rows: LeadPreview[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-raised text-xs uppercase tracking-wide text-muted"><tr><th className="w-1/2 px-3 py-2 font-medium">Phone</th><th className="px-3 py-2 font-medium">Name</th></tr></thead>
        <tbody className="divide-y divide-hairline">
          {rows.slice(0, 5).map((row, index) => <tr key={`${index}-${row.phone}`}><td className="truncate px-3 py-2 text-body">{row.phone || "—"}</td><td className="truncate px-3 py-2 text-body">{row.name || "—"}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Full-page create/edit form (`/campaigns/new`, `/campaigns/[id]/edit`). `campaign` null = create.
 */
export default function CampaignForm({ campaign }: { campaign: Campaign | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const agents = useAgents();
  const representatives = useRepresentatives();
  const plivoPools = usePlivoPools();
  const backHref = campaign ? `/campaigns/${campaign.id}` : "/campaigns";

  const [name, setName] = useState(campaign?.name ?? "");
  const [agentId, setAgentId] = useState(campaign?.agent_id ?? "");
  const [status, setStatus] = useState<Campaign["status"]>(campaign?.status ?? "scheduled");
  const [leadsFile, setLeadsFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<SheetCheck>(null);
  const [linkSheet, setLinkSheet] = useState<SheetCheck>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDraggingLeads, setIsDraggingLeads] = useState(false);
  const [linkImportError, setLinkImportError] = useState<string | null>(null);
  const [isImportingLink, setIsImportingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parseRequest = useRef(0);
  const [leadsSource, setLeadsSource] = useState<"file" | "link">("file");
  const [leadsUrl, setLeadsUrl] = useState("");
  const [representativeIds, setRepresentativeIds] = useState<string[]>(campaign?.representative_ids ?? []);
  const [plivoPoolIds, setPlivoPoolIds] = useState<string[]>(campaign?.plivo_pool_ids ?? []);
  const [transferTimeout, setTransferTimeout] = useState(String(campaign?.transfer_timeout_seconds ?? 30));
  const [startAt, setStartAt] = useState(() => toDateTimeInput(campaign?.start_at));
  const [windowStart, setWindowStart] = useState(campaign?.window_start?.slice(0, 5) ?? "");
  const [windowEnd, setWindowEnd] = useState(campaign?.window_end?.slice(0, 5) ?? "");
  const [callDays, setCallDays] = useState<Weekday[]>(campaign?.call_days ?? []);
  const [retryInterval, setRetryInterval] = useState(String(campaign?.retry_interval_minutes ?? 60));
  const [retryCount, setRetryCount] = useState(String(campaign?.retry_count ?? 1));
  const [retryOn, setRetryOn] = useState<string[]>(campaign?.retry_on ?? ["no_answer"]);
  const [concurrencyLimit, setConcurrencyLimit] = useState(String(campaign?.concurrency_limit ?? 2));
  const [maxLiveCalls, setMaxLiveCalls] = useState(String(campaign?.max_live_calls ?? 50));
  const [callsPerSecond, setCallsPerSecond] = useState(String(campaign?.calls_per_second ?? 2));
  const [submitted, setSubmitted] = useState(false);
  const [activeStep, setActiveStep] = useState<CampaignStep>("details");

  const CAMPAIGN_DRAFT_KEY="CampaignDraft";
  const[draftLoaded,setDraftLoaded] = useState(false);
  

  const chooseFile = async (file: File | null) => {
    parseRequest.current += 1;
    const request = parseRequest.current;
    setLeadsFile(file);
    setLinkSheet(null);
    setLinkImportError(null);
    if (!file) { setSheet(null); setIsParsing(false); return; }
    setLeadsSource("file");
    setSheet(null);
    setIsParsing(true);
    try {
      const result = await checkSheet(file);
      if (request === parseRequest.current) setSheet(result);
    } catch {
      if (request === parseRequest.current) setSheet({ error: "The file could not be read. Try again or choose another file." });
    } finally {
      if (request === parseRequest.current) setIsParsing(false);
    }
  };

  const importLeadsLink = async () => {
    const url = leadsUrl.trim();
    if (!/^https?:\/\//i.test(url)) { setLinkImportError("Enter a valid link that starts with http:// or https://."); return; }
    setIsImportingLink(true);
    setLinkImportError(null);
    setLinkSheet(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`The link returned ${response.status}.`);
      const blob = await response.blob();
      const filename = decodeURIComponent(new URL(url).pathname.split("/").pop() || "leads.csv");
      const file = new File([blob], filename, { type: blob.type });
      const result = await checkSheet(file);
      if (!result || "error" in result) throw new Error(result && "error" in result ? result.error : "The link did not contain a readable leads file.");
      if (result.valid < 1) throw new Error("The file has no valid phone numbers.");
      setLinkSheet(result);
    } catch (error) {
      setLinkImportError(error instanceof Error ? error.message : "The link could not be imported.");
    } finally {
      setIsImportingLink(false);
    }
  };

  const sheetError = sheet && "error" in sheet ? sheet.error : null;
  const leadsUrlError = leadsUrl.trim() && !/^https?:\/\//i.test(leadsUrl.trim())
  ? "Enter a link that starts with http:// or https://."
  : null;
  const activeSheet = leadsSource === "file" ? sheet : linkSheet;
  const hasValidLeads = Boolean(activeSheet && !("error" in activeSheet) && activeSheet.valid > 0 && !isParsing && !isImportingLink);
  const hasPlivo = (plivoPoolIds ?? []).length > 0 || (campaign?.plivo_numbers.length ?? 0) > 0;
  const errors = {
    name: !name.trim() ? "Give the campaign a name." : null,
    agent: !agentId ? "Choose the agent that will make the calls." : null,
    leads: campaign
    ? null
    : leadsSource === "file"
    ? !leadsFile || !hasValidLeads
    ? sheetError ?? "Upload a leads file with at least one valid phone number."
    : null
    : !leadsUrl.trim()
    ? "Paste a link to the leads file."
    : leadsUrlError ?? (!hasValidLeads ? linkImportError ?? "Import a link with at least one valid phone number." : null),
    plivo: !hasPlivo ? "Pick at least one Plivo pool to call from." : null,
    transferTimeout: !intBetween(transferTimeout, 5, 120) ? "Between 5 and 120 seconds." : null,
    retryInterval: !intBetween(retryInterval, 0) ? "Whole number of minutes, 0 or more." : null,
    retryCount: !intBetween(retryCount, 0) ? "Whole number, 0 or more." : null,
    concurrency: !intBetween(concurrencyLimit, 1) ? "Whole number, 1 or more." : null,
    callsPerSecond: !intBetween(callsPerSecond, 1) ? "Whole number, 1 or more." : null,
    maxLive: !intBetween(maxLiveCalls, 1)
    ? "Whole number, 1 or more."
    : Number(maxLiveCalls) < Number(concurrencyLimit)
    ? "Should be at least the number of parallel calls."
    : null,
    window:
    !!windowStart !== !!windowEnd
    ? "Set both a start and an end, or leave both empty."
    : windowStart && windowEnd <= windowStart
    ? "The window must end after it starts."
    : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  const stepErrors: Record<CampaignStep, boolean> = {
    details: Boolean(errors.name || errors.agent || errors.leads),
    calling: Boolean(errors.plivo || errors.transferTimeout || errors.retryInterval || errors.retryCount),
    timing: Boolean(errors.window || errors.concurrency || errors.callsPerSecond || errors.maxLive),
  };
  const activeStepIndex = CAMPAIGN_STEPS.findIndex((step) => step.id === activeStep);
  // Only nag after the first save attempt (a bad file is flagged right away)
  const show = (error: string | null) => (submitted ? error : null);
  
  const mutation = useMutation({
    mutationFn: () => {
      const shared = {
        name: name.trim(),
        agent_id: agentId,
        representative_ids: representativeIds,
        transfer_timeout_seconds: Number(transferTimeout),
        status,
        plivo_numbers: campaign?.plivo_numbers ?? [],
        plivo_pool_ids: plivoPoolIds,
        window_start: windowStart || null,
        window_end: windowEnd || null,
        // All seven is the same as no restriction
        call_days: (callDays ?? []).length === 7 ? [] : WEEKDAYS.map((d) => d.id).filter((d) => callDays.includes(d)),
        retry_interval_minutes: Number(retryInterval),
        retry_count: Number(retryCount),
        concurrency_limit: Number(concurrencyLimit),
        max_live_calls: Number(maxLiveCalls),
        calls_per_second: Number(callsPerSecond),
      };
      if (campaign) {
        const body: CampaignUpdate = {
          ...shared,
          start_at: status === "scheduled" && startAt ? toIsoDateTime(startAt) : undefined,
          retry_on: retryOn as CampaignUpdate["retry_on"],
        };
        return updateCampaign(campaign.id, body);
      }
      const body: CampaignCreate = {
        ...shared,
        ...(status === "scheduled" && startAt ? { start_at: toIsoDateTime(startAt) } : {}),
        timezone: "Asia/Kolkata",
        retry_on: retryOn as CampaignCreate["retry_on"],
      };
      return createCampaign(
        body,
        leadsSource === "link" ? { fileUrl: leadsUrl.trim() } : { file: leadsFile! },
      );
    },
    onSuccess: async (saved) => {
  // Clear draft only after successfully creating a new campaign
  if(!campaign) localStorage.removeItem(CAMPAIGN_DRAFT_KEY);

      queryClient.setQueryData(["campaigns", saved.id], saved);
      if (!campaign) {
        queryClient.setQueryData<string[]>(["campaign-ids"], (ids) =>
          ids ? (ids.includes(saved.id) ? ids : [...ids, saved.id]) : [saved.id],
        );
      }
      showSuccessNotification(`"${saved.name}" was ${campaign ? "updated" : "created"}.`, {
        title: campaign ? "Campaign updated" : "Campaign created",
      });
      router.replace(`/campaigns/${saved.id}`);
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
    },
  });
  
  const submit = () => {
    setSubmitted(true);
    if (valid) {
      mutation.mutate();
      return;
    }
    const firstInvalidStep = CAMPAIGN_STEPS.find((step) => stepErrors[step.id]);
    if (firstInvalidStep) setActiveStep(firstInvalidStep.id);
  };

  const actions = (
    <>
      <Button variant="secondary" className="btn-blue" onClick={() => router.replace(backHref)}>
        Cancel
      </Button>
      {activeStepIndex > 0 && (
        <Button variant="secondary" className="btn-blue" onClick={() => setActiveStep(CAMPAIGN_STEPS[activeStepIndex - 1].id)}>
          Back
        </Button>
      )}
      {activeStepIndex < CAMPAIGN_STEPS.length - 1 ? (
        <div className="flex flex-col-reverse items-end gap-2 sm:flex-row sm:items-center">
          {!campaign && activeStep === "details" && !hasValidLeads && <span className="max-w-64 text-right text-xs text-muted">Add a file or import a link with at least one valid lead to continue.</span>}
          <Button className="btn-blue-filled" disabled={!campaign && activeStep === "details" && !hasValidLeads} onClick={() => setActiveStep(CAMPAIGN_STEPS[activeStepIndex + 1].id)}>
            Continue
          </Button>
        </div>
      ) : (
        <Button className="btn-blue-filled" onClick={submit} loading={mutation.isPending}>
          {campaign ? "Save changes" : "Create campaign"}
        </Button>
      )}
    </>
  );

    // Default a new campaign to the first agent once they load
  useEffect(() => {
    if (!campaign && !agentId && agents.data?.length) setAgentId(agents.data[0].id);
  }, [agentId, agents.data, campaign]);
  
useEffect(()=>{
  if(campaign &&!draftLoaded){
    setDraftLoaded(true);
    return;
  }

  try{
   const saveDraft = localStorage.getItem(CAMPAIGN_DRAFT_KEY);
   if(saveDraft){
    const parsed: unknown = JSON.parse(saveDraft);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Campaign draft must be an object.");
    }

    const draft = parsed as Record<string, unknown>;
    const value = (key: string, legacyKey: string) => draft[key] ?? draft[legacyKey];
    const text = (key: string, legacyKey: string) => {
      const restored = value(key, legacyKey);
      return typeof restored === "string" || typeof restored === "number" ? String(restored) : undefined;
    };
    const strings = (key: string, legacyKey: string) => {
      const restored = value(key, legacyKey);
      return Array.isArray(restored)
        ? restored.filter((item): item is string => typeof item === "string")
        : undefined;
    };

    const restoredName = text("name", "name");
    if (restoredName !== undefined) setName(restoredName);
    const restoredAgentId = text("agentId", "calling_agent");
    if (restoredAgentId !== undefined) setAgentId(restoredAgentId);
    const restoredStatus = CAMPAIGN_STATUSES.find((candidate) => candidate === value("status", "status"));
    if (restoredStatus) setStatus(restoredStatus);
    const restoredPlivoPoolIds = strings("plivoPoolIds", "plivo_pools");
    if (restoredPlivoPoolIds) setPlivoPoolIds(restoredPlivoPoolIds);
    const restoredRepresentativeIds = strings("representativeIds", "call_transfor_agents");
    if (restoredRepresentativeIds) setRepresentativeIds(restoredRepresentativeIds);
    const restoredTransferTimeout = text("transferTimeout", "transfer_ring_time");
    if (restoredTransferTimeout !== undefined) setTransferTimeout(restoredTransferTimeout);
    const restoredStartAt = text("startAt", "start_at");
    if (restoredStartAt !== undefined) setStartAt(restoredStartAt);
    const restoredWindowStart = text("windowStart", "calling_houe_start");
    if (restoredWindowStart !== undefined) setWindowStart(restoredWindowStart);
    const restoredWindowEnd = text("windowEnd", "calling_hour_end");
    if (restoredWindowEnd !== undefined) setWindowEnd(restoredWindowEnd);
    const restoredCallDays = strings("callDays", "call_days");
    if (restoredCallDays) setCallDays(
      restoredCallDays.filter(
        (day): day is Weekday => WEEKDAYS.some((weekday) => weekday.id === day),
      ),
    );
    const restoredConcurrencyLimit = text("concurrencyLimit", "parallel_calls");
    if (restoredConcurrencyLimit !== undefined) setConcurrencyLimit(restoredConcurrencyLimit);
    const restoredMaxLiveCalls = text("maxLiveCalls", "max_live_calls");
    if (restoredMaxLiveCalls !== undefined) setMaxLiveCalls(restoredMaxLiveCalls);
    const restoredCallsPerSecond = text("callsPerSecond", "new_calls_per_second");
    if (restoredCallsPerSecond !== undefined) setCallsPerSecond(restoredCallsPerSecond);
    const restoredRetryCount = text("retryCount", "retry_attempts");
    if (restoredRetryCount !== undefined) setRetryCount(restoredRetryCount);
    const restoredRetryInterval = text("retryInterval", "minutes_between_retries");
    if (restoredRetryInterval !== undefined) setRetryInterval(restoredRetryInterval);
    const restoredRetryOn = strings("retryOn", "retry_when_the_call_is");
    if (restoredRetryOn) setRetryOn(
      restoredRetryOn.filter(
        (condition) => RETRY_CONDITIONS.includes(condition as (typeof RETRY_CONDITIONS)[number]),
      ),
    );
   }
  }catch(error){
  console.error("Failed to restore campaign data",error);
  }finally{
    setDraftLoaded(true);
  }
},[campaign,draftLoaded]);

// UseEFfect to immediately after the restore effect:

useEffect(()=>{
  if(!draftLoaded) return;

  const draft = {
    name,
    agentId,
    status,
    plivoPoolIds,
    representativeIds,
    transferTimeout,
    startAt,
    windowStart,
    windowEnd,
    callDays,
    concurrencyLimit,
    maxLiveCalls,
    callsPerSecond,
    retryCount,
    retryInterval,
    retryOn,
  };

localStorage.setItem(CAMPAIGN_DRAFT_KEY,JSON.stringify(draft));


},[
  draftLoaded,
  name,
  agentId,
  status,
  plivoPoolIds,
  representativeIds,
  transferTimeout,
  startAt,
  windowStart,
  windowEnd,
  callDays,
  concurrencyLimit,
  maxLiveCalls,
  callsPerSecond,
  retryCount,
  retryInterval,
  retryOn
]);

  return (
    <FormPage
    title={campaign ? `Edit campaign: ${campaign.name}` : "New campaign"}
      footer={actions}
      showHeaderActions={false}
      flushFooterToBottom
      error={submitted && !valid ? "Some fields need attention — they're marked below." : null}
    >
      <div className=" mt-5">
        <div
          role="tablist"
          aria-label="Campaign setup"
          className="no-scrollbar flex gap-1 overflow-x-auto border-b border-hairline"
        >
          {CAMPAIGN_STEPS.map((step, index) => {
            const selected = step.id === activeStep;
            const hasError = submitted && stepErrors[step.id];
            const complete = !stepErrors[step.id];
            return (
              <button
                key={step.id}
                id={`campaign-tab-${step.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="campaign-step-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveStep(step.id)}
                onKeyDown={(event) => {
                  const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                  if (!direction) return;
                  event.preventDefault();
                  const nextIndex = (index + direction + CAMPAIGN_STEPS.length) % CAMPAIGN_STEPS.length;
                  const nextStep = CAMPAIGN_STEPS[nextIndex];
                  setActiveStep(nextStep.id);
                  document.getElementById(`campaign-tab-${nextStep.id}`)?.focus();
                }}
                className={`-mb-px flex h-12 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors ${
                  selected
                    ? "border-[var(--tab-border-active)] text-[var(--tab-border-active)]"
                    : hasError
                      ? "border-transparent text-loss hover:text-loss"
                      : "border-transparent text-muted hover:text-heading"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                    hasError
                      ? "bg-loss-bg text-loss"
                      : selected
                        ? "bg-primary text-primary-foreground"
                        : complete
                          ? "bg-gain-bg text-gain"
                          : "bg-chip text-muted"
                  }`}
                >
                  {complete && !selected && !hasError ? <Check size={12} strokeWidth={3} /> : index + 1}
                </span>
                {step.label}
              </button>
            );
          })}
        </div>

        <div
          id="campaign-step-panel"
          role="tabpanel"
          aria-labelledby={`campaign-tab-${activeStep}`}
          className="pt-6"
        >
          {activeStep === "details" && (
              <div className="space-y-6">
            <Panel title="Details" description="A name your team will recognise, and the AI agent that speaks on every call.">
            <Field label="Campaign name" required error={show(errors.name)}>
              <TextInput value={name} maxLength={255} onChange={(e) => setName(e.target.value)} placeholder="e.g. October renewals" aria-invalid={!!show(errors.name)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Calling agent" required error={show(errors.agent)}>
                <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-invalid={!!show(errors.agent)}>
                  <option value="">Select an agent</option>
                  {agents.data?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" hint="Scheduled starts calling straight away (or at the start time). A draft waits until you schedule it.">
                <Select value={status} onChange={(e) => setStatus(e.target.value as Campaign["status"])}>
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s} value={s}>{humanize(s)}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Panel>
         
          <Panel
            title="Leads"
            description={
              campaign
                ? "The leads were imported when this campaign was created."
                : "Upload a CSV, Excel, or XML file, or import from a file link. Leads need a phone value; names are optional."
            }
          >
            {campaign ? (
              <p className="text-sm text-body">
                Leads can&apos;t be changed after a campaign is created. To call a different list, create a new campaign with that sheet.
              </p>
            ) : (
              <div className="space-y-4">
                <div role="tablist" aria-label="Leads source" className="grid w-full grid-cols-2 border-b border-hairline sm:inline-flex sm:w-auto">
                  {([ ["file", "Upload file"], ["link", "Import from link"] ] as const).map(([source, label]) => (
                    <button key={source} type="button" role="tab" aria-selected={leadsSource === source} onClick={() => setLeadsSource(source)} className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${leadsSource === source ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-muted hover:text-heading"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {leadsSource === "file" ? (
                  <div className="space-y-4">
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xml" className="sr-only" onChange={(event) => { void chooseFile(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
                    {!leadsFile ? (
                      <div role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }} onDragOver={(event) => { event.preventDefault(); setIsDraggingLeads(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDraggingLeads(false); }} onDrop={(event) => { event.preventDefault(); setIsDraggingLeads(false); void chooseFile(event.dataTransfer.files?.[0] ?? null); }} className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-5 py-8 text-center transition-colors ${isDraggingLeads ? "border-accent bg-accent-bg" : "border-hairline-strong bg-surface-input hover:border-accent-strong hover:bg-accent-bg/40"}`}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-bg text-accent-text"><CloudUpload size={23} aria-hidden /></span>
                        <span className="text-sm font-medium text-heading">Drag &amp; drop your file here</span>
                        <span className="text-xs text-muted">CSV, Excel or XML · max 10 MB</span>
                        <Button type="button" variant="secondary" className="btn-blue mt-1" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }}>Browse files</Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline-strong bg-surface-input p-4">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-bg text-accent-text"><FileSpreadsheet size={20} aria-hidden /></span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-heading">{leadsFile.name}</p>
                            <p className="text-xs text-muted">{(leadsFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button type="button" size="sm" variant="secondary" className="btn-blue" onClick={() => fileInputRef.current?.click()}>Replace</Button>
                          <button type="button" aria-label="Remove file" title="Remove file" onClick={() => void chooseFile(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-heading"><X size={17} /></button>
                          <div className="w-full border-t border-hairline pt-3 text-xs text-muted">
                            {isParsing ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Parsing file…</span> : sheet && "error" in sheet ? <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-loss">{sheet.error}</span><Button type="button" size="sm" variant="secondary" onClick={() => void chooseFile(leadsFile)}>Try again</Button></div> : sheet ? <span><strong className="font-semibold text-heading">{sheet.valid} valid</strong> · {sheet.duplicates} duplicates skipped · {sheet.invalid} invalid</span> : null}
                          </div>
                        </div>
                        {sheet && !("error" in sheet) && <LeadPreviewTable rows={sheet.preview} />}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
                      <p>Required: phone. Optional: name. 10-digit numbers get +91 added. Duplicates are skipped.</p>
                      <a href="data:text/csv;charset=utf-8,phone%2Cname%0A9876543210%2CExample%20Lead" download="sample-leads.csv" className="inline-flex shrink-0 items-center gap-1 font-medium text-[var(--input-glow)] hover:underline"><Download size={14} aria-hidden />Download sample CSV</a>
                    </div>
                    {show(errors.leads) && <p role="alert" className="text-xs text-loss">{show(errors.leads)}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <TextInput type="url" value={leadsUrl} onChange={(event) => { setLeadsUrl(event.target.value); setLinkSheet(null); setLinkImportError(null); }} placeholder="https://…/leads.csv" aria-label="Leads file URL" aria-invalid={!!(leadsUrlError || linkImportError)} className="min-w-0 flex-1" />
                      <Button type="button" className="btn-blue-filled shrink-0" onClick={() => void importLeadsLink()} loading={isImportingLink}>Import</Button>
                    </div>
                    {(linkImportError || leadsUrlError) && <p role="alert" className="text-xs text-loss">{linkImportError ?? leadsUrlError}</p>}
                    {linkSheet && !("error" in linkSheet) && <div className="space-y-3"><p className="text-xs text-muted"><strong className="font-semibold text-heading">{linkSheet.valid} valid</strong> · {linkSheet.duplicates} duplicates skipped · {linkSheet.invalid} invalid</p><LeadPreviewTable rows={linkSheet.preview} /></div>}
                    <div className="flex flex-col gap-2 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
                      <p>Required: phone. Optional: name. 10-digit numbers get +91 added. Duplicates are skipped.</p>
                      <a href="data:text/csv;charset=utf-8,phone%2Cname%0A9876543210%2CExample%20Lead" download="sample-leads.csv" className="inline-flex shrink-0 items-center gap-1 font-medium text-[var(--input-glow)] hover:underline"><Download size={14} aria-hidden />Download sample CSV</a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
          </div>
          )}



{activeStep === "calling" && (
  <div className="space-y-6">
    <Panel title="Calling from" description="Choose the Plivo pools to call from and who receives transferred leads.">
      <MultiSelect
        label="Plivo pools"
        required
        loading={plivoPools.isLoading}
        options={(plivoPools.data ?? []).map((p) => ({ id: p.id, label: p.name, detail: `${p.pool_size} numbers` }))}
        selected={plivoPoolIds}
        onChange={setPlivoPoolIds}
        error={show(errors.plivo)}
        hint="Calls use the numbers in these pools as caller ID."
      />
      <MultiSelect
        label="Call transfer agents"
        loading={representatives.isLoading}
        options={(representatives.data ?? []).map((r) => ({ id: r.id, label: r.name, detail: r.phone_e164 }))}
        selected={representativeIds}
        onChange={setRepresentativeIds}
        hint="Leave empty to ring every active transfer agent."
      />
      <Field label="Transfer ring time (seconds)" error={show(errors.transferTimeout)} hint="How long each representative's phone rings, 5–120.">
        <TextInput type="number" inputMode="numeric" min={5} max={120} step={1} value={transferTimeout} onChange={(e) => setTransferTimeout(e.target.value)} aria-invalid={!!show(errors.transferTimeout)} className="sm:max-w-[12rem]" />
      </Field>
    </Panel>

    <Panel title="Retries" description="Choose what happens when a lead doesn't pick up.">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Retry attempts" error={show(errors.retryCount)} hint="0 means call each lead once.">
          <TextInput type="number" inputMode="numeric" min={0} step={1} value={retryCount} onChange={(e) => setRetryCount(e.target.value)} aria-invalid={!!show(errors.retryCount)} />
        </Field>
        <Field label="Minutes between retries" error={show(errors.retryInterval)}>
          <TextInput type="number" inputMode="numeric" min={0} step={1} value={retryInterval} onChange={(e) => setRetryInterval(e.target.value)} aria-invalid={!!show(errors.retryInterval)} />
        </Field>
      </div>
      <MultiSelect
        label="Retry when the call is"
        options={RETRY_CONDITIONS.map((c) => ({ id: c, label: humanize(c) }))}
        selected={retryOn}
        onChange={setRetryOn}
      />
    </Panel>
  </div>
)}

          {activeStep === "timing" && (
            <Panel title="Timing" description="Set when calls may go out. Times are India Standard Time.">
            {status === "scheduled" && (
              <Field label="Start at" hint="Leave empty to start as soon as the campaign is saved.">
                <TextInput type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="sm:max-w-xs" />
              </Field>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Calling hours start" hint="Leave both empty to call any time.">
                <TextInput type="time" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} aria-invalid={!!show(errors.window)} />
              </Field>
              <Field label="Calling hours end" error={show(errors.window)}>
                <TextInput type="time" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} aria-invalid={!!show(errors.window)} />
              </Field>
            </div>
            <fieldset>
              <legend className="text-sm font-medium text-heading">Call days</legend>
              <p className="mt-0.5 text-xs text-muted">
                Calls go out only on these days, within the calling hours, week after week until every lead is done. Pick none to call every day.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {WEEKDAYS.map((d) => {
                  const on = callDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setCallDays((days) => (on ? days.filter((x) => x !== d.id) : [...days, d.id]))}
                      className={
                        on
                          ? "h-9 min-w-12 rounded-md border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors"
                          : "h-9 min-w-12 rounded-md border border-hairline-strong bg-surface px-3 text-sm font-medium text-heading transition-colors hover:bg-surface-hover"
                      }
                    >
                      {d.short}
                    </button>
                  );
                })}
                <span className="ml-1 text-sm text-muted">{formatDays(callDays)}</span>
              </div>
              <div className="mt-2 flex gap-3 text-sm">
                {(
                  [
                    ["Every day", [] as Weekday[]],
                    ["Mon–Fri", WEEKDAYS.slice(0, 5).map((d) => d.id)],
                    ["Weekends", WEEKDAYS.slice(5).map((d) => d.id)],
                  ] as const
                ).map(([label, days]) => (
                  <button key={label} type="button" onClick={() => setCallDays([...days])} className="font-medium text-link hover:underline">
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Parallel calls" error={show(errors.concurrency)} hint="How many leads are dialled at once. Can be changed while running.">
                <TextInput type="number" inputMode="numeric" min={1} step={1} value={concurrencyLimit} onChange={(e) => setConcurrencyLimit(e.target.value)} aria-invalid={!!show(errors.concurrency)} />
              </Field>
              <Field label="Max live calls" error={show(errors.maxLive)} hint="Safety ceiling on calls connected at the same moment.">
                <TextInput type="number" inputMode="numeric" min={1} step={1} value={maxLiveCalls} onChange={(e) => setMaxLiveCalls(e.target.value)} aria-invalid={!!show(errors.maxLive)} />
              </Field>
              <Field label="New calls per second" error={show(errors.callsPerSecond)} hint="How fast calls are started. Keep within your Plivo account limit.">
                <TextInput type="number" inputMode="numeric" min={1} step={1} value={callsPerSecond} onChange={(e) => setCallsPerSecond(e.target.value)} aria-invalid={!!show(errors.callsPerSecond)} />
              </Field>
            </div>
            </Panel>
          )}

        </div>
      </div>
    </FormPage>
  );
}
