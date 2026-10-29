"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { listAgents, listRepresentatives } from "@/lib/callingAgentApi";
import type { Agent, Representative } from "@/lib/callingAgentApi";
import {
  createCampaign,
  deleteCampaign,
  getLeadPools,
  getPlivoPools,
  updateCampaign,
} from "@/lib/api";
import type { Campaign, CampaignCreate, CampaignUpdate, LeadPool, PlivoPool } from "@/types/types";
import { showSuccessNotification } from "@/hooks/useNotification";
import { Button } from "@/components/calling-agent/ui";

const fieldClass = "mt-1 w-full min-w-0 rounded-md border border-hairline-strong bg-surface-input px-3 py-2 text-heading transition-colors hover:border-accent-strong focus:border-accent-strong focus:outline-none";
const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const toDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toIsoDateTime = (value: string) => value ? new Date(value).toISOString() : null;
const fmtWindowTime = (value?: string | null) => value ? value.slice(0, 5) : "—";

function ChoiceFieldset({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: Array<{ id: string; label: string; detail?: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.detail ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <fieldset className="space-y-2 text-sm text-body">
      <legend>{title}</legend>
      <div ref={ref} className="relative">
        <div className="flex min-h-10 items-center gap-2 rounded-md border border-hairline-strong bg-surface-input px-3 py-1 transition-colors focus-within:border-accent-strong">
          <Search size={15} className="shrink-0 text-muted" />
          <input
            value={search}
            onFocus={() => setOpen(true)}
            onChange={(event) => { setSearch(event.target.value); setOpen(true); }}
            onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
            placeholder={selected.length ? `Search more ${title.toLowerCase()}...` : `Search ${title.toLowerCase()}...`}
            aria-label={`Search ${title}`}
            aria-expanded={open}
            style={{ outline: "none" }}
            className="min-w-[7rem] flex-1 bg-transparent py-1 text-sm text-heading outline-none placeholder:text-muted"
          />
          <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`${open ? "Close" : "Open"} ${title}`} className="shrink-0 text-muted hover:text-heading">
            <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
        {selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.map((id) => {
              const option = options.find((item) => item.id === id);
              return option ? (
                <span key={id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-chip px-2 py-1 text-xs text-body">
                  <span className="break-all">{option.label}{option.detail ? ` ${option.detail}` : ""}</span>
                  <button type="button" aria-label={`Remove ${option.label}`} onClick={() => toggle(id)} className="shrink-0 rounded-full hover:text-heading"><X size={12} /></button>
                </span>
              ) : null;
            })}
          </div>
        )}
        {open && (
          <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-hairline-strong bg-surface-input p-1 shadow-md">
            {filteredOptions.length === 0 ? <p className="p-2 text-muted">{options.length === 0 ? `No ${title.toLowerCase()} available.` : "No matches found."}</p> : filteredOptions.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-surface-hover">
                <input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} className="accent-accent" />
                <span className="min-w-0 break-all text-heading">{option.label}</span>
                {option.detail && <span className="ml-auto shrink-0 text-xs text-muted">{option.detail}</span>}
              </label>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  );
}

function CampaignFormDrawer({
  campaign,
  agents,
  representatives,
  leadPools,
  plivoPools,
  pending,
  onClose,
  onSave,
}: {
  campaign: Campaign | null;
  agents: Agent[];
  representatives: Representative[];
  leadPools: LeadPool[];
  plivoPools: PlivoPool[];
  pending: boolean;
  onClose: () => void;
  onSave: (createBody: CampaignCreate, updateBody: CampaignUpdate) => void;
}) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [agentId, setAgentId] = useState(campaign?.agent_id ?? "");
  const [status, setStatus] = useState<Campaign["status"]>(campaign?.status ?? "draft");
  const [leadPoolIds, setLeadPoolIds] = useState<string[]>(campaign?.lead_pool_ids ?? []);
  const [representativeIds, setRepresentativeIds] = useState<string[]>(campaign?.representative_ids ?? []);
  const plivoNumbersSelected = campaign?.plivo_numbers ?? [];
  const [plivoPoolIds, setPlivoPoolIds] = useState<string[]>(campaign?.plivo_pool_ids ?? []);
  const [transferTimeout, setTransferTimeout] = useState(String(campaign?.transfer_timeout_seconds ?? 30));
  const [startAt, setStartAt] = useState(() => toDateTimeInput(campaign?.start_at));
  const [windowStart, setWindowStart] = useState(campaign?.window_start?.slice(0, 5) ?? "");
  const [windowEnd, setWindowEnd] = useState(campaign?.window_end?.slice(0, 5) ?? "");
  const [retryInterval, setRetryInterval] = useState(String(campaign?.retry_interval_minutes ?? 60));
  const [retryCount, setRetryCount] = useState(String(campaign?.retry_count ?? 1));
  const [retryOn, setRetryOn] = useState<string[]>(campaign?.retry_on ?? ["no_answer"]);
  const [concurrencyLimit, setConcurrencyLimit] = useState(String(campaign?.concurrency_limit ?? 1));
  const parsedTransferTimeout = Number(transferTimeout);
  const parsedRetryInterval = Number(retryInterval);
  const parsedRetryCount = Number(retryCount);
  const parsedConcurrencyLimit = Number(concurrencyLimit);
  const validTransferTimeout = Number.isInteger(parsedTransferTimeout) && parsedTransferTimeout >= 1;
  const validRetryInterval = Number.isInteger(parsedRetryInterval) && parsedRetryInterval >= 1;
  const validRetryCount = Number.isInteger(parsedRetryCount) && parsedRetryCount >= 0;
  const validConcurrencyLimit = Number.isInteger(parsedConcurrencyLimit) && parsedConcurrencyLimit >= 1;
  const validNumericFields = validTransferTimeout && validRetryInterval && validRetryCount && validConcurrencyLimit;

  useEffect(() => {
    if (!campaign && !agentId && agents.length > 0) setAgentId(agents[0].id);
  }, [agentId, agents, campaign]);

  const save = () => {
    const createBody: CampaignCreate = {
      name: name.trim(),
      agent_id: agentId,
      representative_ids: representativeIds,
      transfer_timeout_seconds: parsedTransferTimeout,
      status,
      lead_pool_ids: leadPoolIds,
      plivo_numbers: plivoNumbersSelected,
      plivo_pool_ids: plivoPoolIds,
      ...(status === "scheduled" && startAt ? { start_at: toIsoDateTime(startAt) } : {}),
      window_start: windowStart || null,
      window_end: windowEnd || null,
      timezone: campaign?.timezone ?? "Asia/Kolkata",
      retry_interval_minutes: parsedRetryInterval,
      retry_count: parsedRetryCount,
      retry_on: retryOn as CampaignCreate["retry_on"],
      concurrency_limit: parsedConcurrencyLimit,
    };
    const updateBody: CampaignUpdate = {
      name: name.trim(),
      agent_id: agentId,
      representative_ids: representativeIds,
      transfer_timeout_seconds: parsedTransferTimeout,
      status,
      lead_pool_ids: leadPoolIds,
      plivo_numbers: plivoNumbersSelected,
      plivo_pool_ids: plivoPoolIds,
      start_at: status === "scheduled" ? toIsoDateTime(startAt) : null,
      window_start: windowStart || null,
      window_end: windowEnd || null,
      retry_interval_minutes: parsedRetryInterval,
      retry_count: parsedRetryCount,
      retry_on: retryOn as CampaignUpdate["retry_on"],
      concurrency_limit: parsedConcurrencyLimit,
    };
    onSave(createBody, updateBody);
  };

  return (
    <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="animate-slide-in-right flex h-full max-h-screen w-full max-w-md flex-col overflow-hidden bg-surface shadow-xl">
        <div className="shrink-0 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-heading">
            {campaign && <Pencil size={18} className="text-accent-text" />}
            {campaign ? "Edit campaign" : "New campaign"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-heading"><X size={20} /></button>
          </div>
        </div>
        <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <label className="block text-sm text-body">
            Campaign Name
            <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm text-body">
            Calling Agent
            <select value={agentId} onChange={(event) => setAgentId(event.target.value)} className={fieldClass}>
              <option value="">Select an agent</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <label className="block text-sm text-body">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as Campaign["status"])} className={fieldClass}>
              {["draft", "scheduled", "running", "paused", "completed", "cancelled"].map((value) => (
                <option key={value} value={value}>{value.replace(/^\w/, (letter) => letter.toUpperCase())}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-body">
            Transfer Timeout (seconds)
            <input type="number" min={1} step={1} value={transferTimeout} onChange={(event) => setTransferTimeout(event.target.value)} className={fieldClass} />
          </label>
          {status === "scheduled" && (
            <label className="block text-sm text-body">
              Start At
              <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className={fieldClass} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-body">
              Window Start
              <input type="time" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} className={fieldClass} />
            </label>
            <label className="block text-sm text-body">
              Window End
              <input type="time" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} className={fieldClass} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-body">
              Retry Interval (minutes)
              <input type="number" min={1} step={1} value={retryInterval} onChange={(event) => setRetryInterval(event.target.value)} className={fieldClass} />
            </label>
            <label className="block text-sm text-body">
              Retry Count
              <input type="number" min={0} step={1} value={retryCount} onChange={(event) => setRetryCount(event.target.value)} className={fieldClass} />
            </label>
          </div>
          <label className="block text-sm text-body">
            Concurrency Limit
            <input type="number" min={1} step={1} inputMode="numeric" value={concurrencyLimit} onChange={(event) => setConcurrencyLimit(event.target.value)} className={fieldClass} />
          </label>
          <ChoiceFieldset
            title="Lead Pools"
            options={leadPools.map((pool) => ({ id: pool.id, label: pool.name, detail: `${pool.pool_size} leads` }))}
            selected={leadPoolIds}
            onChange={setLeadPoolIds}
          />
          <ChoiceFieldset
            title="Representatives"
            options={representatives.map((rep) => ({ id: rep.id, label: rep.name, detail: rep.phone_e164 }))}
            selected={representativeIds}
            onChange={setRepresentativeIds}
          />
          <ChoiceFieldset
            title="Plivo Number Pools"
            options={plivoPools.map((pool) => ({ id: pool.id, label: pool.name, detail: `${pool.pool_size} numbers` }))}
            selected={plivoPoolIds}
            onChange={setPlivoPoolIds}
          />
          <ChoiceFieldset
            title="Retry On"
            options={["no_answer", "not_connected", "busy", "failed"].map((value) => ({ id: value, label: value.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase()) }))}
            selected={retryOn}
            onChange={setRetryOn}
          />
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-hairline bg-raised px-5 py-4 sm:px-6">
          <Button onClick={save} disabled={pending || !name.trim() || !agentId || leadPoolIds.length === 0 || !validNumericFields}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </aside>
    </div>
  );
}

export default function CampaignsTab({
  campaigns = [],
  campaignsLoading = false,
  campaignsError = null,
}: {
  campaigns?: Campaign[];
  campaignsLoading?: boolean;
  campaignsError?: Error | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: listAgents, retry: false, refetchOnMount: "always" });
  const representativesQuery = useQuery({ queryKey: ["representatives"], queryFn: listRepresentatives, retry: false });
  const leadPoolsQuery = useQuery({ queryKey: ["lead-pools"], queryFn: getLeadPools, retry: false });
  const plivoPoolsQuery = useQuery({ queryKey: ["plivo-pools"], queryFn: getPlivoPools, retry: false });
  const [editing, setEditing] = useState<Campaign | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const agents = agentsQuery.data ?? [];
  const representatives = representativesQuery.data ?? [];
  const leadPools = leadPoolsQuery.data ?? [];
  const plivoPools = plivoPoolsQuery.data ?? [];

  const create = useMutation({
    mutationFn: createCampaign,
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
      showSuccessNotification(`"${campaign.name}" was created.`, { title: "Campaign created" });
      setEditing(undefined);
    },
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CampaignUpdate }) => updateCampaign(id, body),
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
      showSuccessNotification(`"${campaign.name}" was updated.`, { title: "Campaign updated" });
      setEditing(undefined);
    },
  });
  const remove = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: async (_result, id) => {
      const deleted = campaigns.find((campaign) => campaign.id === id);
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
      showSuccessNotification(`"${deleted?.name ?? "Campaign"}" was deleted.`, { title: "Campaign deleted" });
      setDeleting(null);
    },
  });

  const pageCount = Math.max(1, Math.ceil(campaigns.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = campaigns.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasScheduled = campaigns.some((campaign) => campaign.status === "scheduled");
  const hasNonScheduled = campaigns.some((campaign) => campaign.status !== "scheduled");
  const campaignColumns = [
    "Name", "Status", "Transfer Timeout (sec)",
    ...(hasScheduled ? ["Started At"] : []),
    ...(hasNonScheduled ? ["Window Start", "Window End"] : []),
    "Ended At", "Concurrent Calls", "Action",
  ];
  const save = (createBody: CampaignCreate, updateBody: CampaignUpdate) => {
    if (editing) update.mutate({ id: editing.id, body: updateBody });
    else create.mutate(createBody);
  };
  const statusClass = (status: Campaign["status"]) => {
    if (status === "running" || status === "completed") return "bg-gain-bg text-gain";
    if (status === "scheduled") return "bg-info-bg text-info";
    if (status === "paused") return "bg-warn-bg text-warn";
    if (status === "cancelled") return "bg-loss-bg text-loss";
    return "bg-chip text-muted";
  };

  return (
    <section>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { void agentsQuery.refetch(); setEditing(null); }}><Plus size={16} /> New Campaign</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-hairline bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline bg-raised text-[11px] uppercase tracking-[0.08em] text-muted">
            <tr>{campaignColumns.map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {campaignsLoading && <tr><td colSpan={campaignColumns.length} className="p-8 text-center text-muted">Loading campaigns...</td></tr>}
            {campaignsError && <tr><td colSpan={campaignColumns.length} className="p-8 text-center text-loss">Failed to load campaigns: {campaignsError.message}</td></tr>}
            {!campaignsLoading && !campaignsError && campaigns.length === 0 && <tr><td colSpan={campaignColumns.length} className="p-8 text-center text-muted">No campaigns yet</td></tr>}
            {visible.map((campaign) => (
              <tr key={campaign.id} className="transition-colors hover:bg-surface-hover">
                {[
                  campaign.name,
                  campaign.status,
                  `${campaign.transfer_timeout_seconds} sec`,
                  ...(hasScheduled ? [campaign.status === "scheduled" ? fmtDate(campaign.start_at) : "—"] : []),
                  ...(hasNonScheduled ? [
                    campaign.status !== "scheduled" ? fmtWindowTime(campaign.window_start) : "—",
                    campaign.status !== "scheduled" ? fmtWindowTime(campaign.window_end) : "—",
                  ] : []),
                  fmtDate(campaign.ended_at),
                  String(campaign.concurrent_calls ?? campaign.concurrency_limit),
                ].map((value, index) => (
                  <td key={index} className="max-w-xs break-words px-4 py-3 text-body">
                    {index === 1
                      ? <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusClass(campaign.status)}`}>{campaign.status.replace(/^\w/, (letter) => letter.toUpperCase())}</span>
                      : value}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <button type="button" title="Edit" aria-label={`Edit ${campaign.name}`} onClick={() => { void agentsQuery.refetch(); setEditing(campaign); }} className="text-muted transition-colors hover:text-accent-text"><Pencil size={18} /></button>
                    <button type="button" title="Delete" aria-label={`Delete ${campaign.name}`} onClick={() => setDeleting(campaign)} disabled={remove.isPending} className="text-muted transition-colors hover:text-accent-text disabled:opacity-40"><Trash2 size={18} /></button>
                    <button type="button" title={`View ${campaign.name}`} onClick={() => router.push(`/campaigns/${encodeURIComponent(campaign.id)}`)} className="text-sm text-body underline underline-offset-2 transition-colors hover:text-accent-text">View</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Page {currentPage} of {pageCount}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1 || campaignsLoading || !!campaignsError} className="inline-flex items-center gap-1 rounded-md border border-hairline px-3 py-2 text-sm text-body transition-colors hover:bg-surface-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft size={16} /> Previous</button>
          <span className="min-w-8 text-center text-sm font-medium text-heading">{currentPage}</span>
          <button type="button" onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={currentPage >= pageCount || campaignsLoading || !!campaignsError} className="inline-flex items-center gap-1 rounded-md border border-hairline px-3 py-2 text-sm text-body transition-colors hover:bg-surface-hover hover:text-heading disabled:cursor-not-allowed disabled:opacity-50">Next <ChevronRight size={16} /></button>
        </div>
      </div>

      {editing !== undefined && <CampaignFormDrawer key={editing?.id ?? "new"} campaign={editing} agents={agents} representatives={representatives} leadPools={leadPools} plivoPools={plivoPools} pending={create.isPending || update.isPending} onClose={() => setEditing(undefined)} onSave={save} />}
      {deleting && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget && !remove.isPending) setDeleting(null); }} className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-campaign-title" className="w-full max-w-sm rounded-xl bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between"><h2 id="delete-campaign-title" className="text-lg font-semibold text-heading">Delete campaign?</h2><button type="button" onClick={() => setDeleting(null)} disabled={remove.isPending} aria-label="Close" className="text-muted transition-colors hover:text-heading disabled:opacity-50"><X size={20} /></button></div>
            <p className="mt-2 text-sm text-muted">Are you sure you want to delete “{deleting.name}”? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => remove.mutate(deleting.id)} disabled={remove.isPending}>{remove.isPending ? "Deleting..." : "Delete"}</Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
