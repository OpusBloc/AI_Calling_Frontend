"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCampaign, updateCampaign } from "@/lib/api";
import type { Campaign, CampaignCreate, CampaignUpdate, Weekday } from "@/types/types";
import { useAgents, usePlivoPools, useRepresentatives } from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import MultiSelect from "@/components/MultiSelect";
import { WEEKDAYS, formatDays } from "@/components/campaigns/CampaignsTab";
import { Button, Field, FileDrop, FormPage, FormSection, Select, TextInput, humanize } from "@/components/ui";

export const CAMPAIGN_STATUSES: Campaign["status"][] = ["draft", "scheduled", "running", "paused", "completed", "cancelled"];
const RETRY_CONDITIONS = ["no_answer", "not_connected", "busy", "failed"] as const;

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

const intBetween = (value: string, min: number, max = Infinity) => {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
};

type SheetCheck = { rows: number; phoneColumn: string; hasName: boolean } | { error: string } | null;

/**
 * Quick look at a CSV before upload: count rows and find the phone column.
 * Excel files can't be read here, so the backend checks those.
 */
async function checkSheet(file: File): Promise<SheetCheck> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext !== "csv" && ext !== "xlsx") return { error: "Upload a .csv or .xlsx file." };
  if (ext === "xlsx") return null;
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { error: "This file is empty." };
  const headers = lines[0].replace(/^﻿/, "").split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const phoneColumn = headers.find((h) => PHONE_HEADERS.includes(h));
  if (!phoneColumn) return { error: `The first row needs a phone column (${PHONE_HEADERS.slice(0, 3).join(", ")}…).` };
  if (lines.length < 2) return { error: "The file has a header row but no leads." };
  return { rows: lines.length - 1, phoneColumn, hasName: headers.some((h) => NAME_HEADERS.includes(h)) };
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

  // Default a new campaign to the first agent once they load
  useEffect(() => {
    if (!campaign && !agentId && agents.data?.length) setAgentId(agents.data[0].id);
  }, [agentId, agents.data, campaign]);

  const chooseFile = async (file: File | null) => {
    setLeadsFile(file);
    setSheet(file ? await checkSheet(file) : null);
  };

  const sheetError = sheet && "error" in sheet ? sheet.error : null;
  const hasPlivo = plivoPoolIds.length > 0 || (campaign?.plivo_numbers.length ?? 0) > 0;
  const errors = {
    name: !name.trim() ? "Give the campaign a name." : null,
    agent: !agentId ? "Choose the agent that will make the calls." : null,
    leads: campaign ? null : !leadsFile ? "Upload the sheet of leads to call." : sheetError,
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
        call_days: callDays.length === 7 ? [] : WEEKDAYS.map((d) => d.id).filter((d) => callDays.includes(d)),
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
      return createCampaign(body, leadsFile!);
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(["campaigns", saved.id], saved);
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
      showSuccessNotification(`"${saved.name}" was ${campaign ? "updated" : "created"}.`, {
        title: campaign ? "Campaign updated" : "Campaign created",
      });
      router.replace(`/campaigns/${saved.id}`);
    },
  });

  const submit = () => {
    setSubmitted(true);
    if (valid) mutation.mutate();
  };

  const actions = (
    <>
      <Button variant="secondary" onClick={() => router.replace(backHref)}>
        Cancel
      </Button>
      <Button onClick={submit} loading={mutation.isPending}>
        {campaign ? "Save changes" : "Create campaign"}
      </Button>
    </>
  );

  return (
    <FormPage
      breadcrumbs={[
        { label: "Campaigns", href: "/campaigns" },
        ...(campaign ? [{ label: campaign.name, href: backHref }] : []),
        { label: campaign ? "Edit" : "New campaign" },
      ]}
      title={campaign ? `Edit ${campaign.name}` : "New campaign"}
      description="Who to call, which agent talks, and when calls may go out."
      footer={actions}
      error={submitted && !valid ? "Some fields need attention — they're marked below." : null}
    >
      <FormSection title="Basics" description="A name your team will recognise, and the AI agent that speaks on every call.">
        <Field label="Campaign name" required error={show(errors.name)}>
          <TextInput value={name} maxLength={255} onChange={(e) => setName(e.target.value)} placeholder="e.g. October renewals" aria-invalid={!!show(errors.name)} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Calling agent" required error={show(errors.agent)}>
            <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-invalid={!!show(errors.agent)}>
              <option value="">{agents.isLoading ? "Loading…" : "Select an agent"}</option>
              {agents.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" hint="Scheduled starts calling straight away (or at the start time). A draft waits until you schedule it.">
            <Select value={status} onChange={(e) => setStatus(e.target.value as Campaign["status"])}>
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection
        title="Leads"
        description={
          campaign
            ? "The leads were imported when this campaign was created."
            : "Upload a CSV or Excel sheet. The first row must have a phone column; a name column is optional."
        }
      >
        {campaign ? (
          <p className="text-sm text-body">
            Leads can&apos;t be changed after a campaign is created. To call a different list, create a new campaign with that sheet.
          </p>
        ) : (
          <FileDrop
            label="Upload leads sheet"
            accept=".csv,.xlsx"
            file={leadsFile}
            onChange={chooseFile}
            error={sheetError ?? show(errors.leads)}
            details={
              sheet && "rows" in sheet ? (
                <span className="text-gain">
                  {sheet.rows} lead{sheet.rows === 1 ? "" : "s"} · phone column “{sheet.phoneColumn}”{sheet.hasName ? " · names included" : ""}
                </span>
              ) : null
            }
            hint={
              <>
                Columns: <code className="tnum">phone</code> (or phone_number, mobile, phone_e164) and optional{" "}
                <code className="tnum">name</code>. 10-digit numbers get +91 added. Duplicates are skipped.
              </>
            }
          />
        )}
      </FormSection>

      <FormSection title="Calling from" description="Plivo pools the calls are placed from, and who interested leads are transferred to.">
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
      </FormSection>

      <FormSection title="Timing" description="When calls may go out. Times are India Standard Time.">
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
            Calls go out only on these days, within the calling hours, week after week until every lead is done. Pick none to call
            every day.
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
                      ? "h-9 min-w-12 rounded-md border border-accent bg-accent px-3 text-sm font-medium text-on-accent transition-colors"
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
              <button key={label} type="button" onClick={() => setCallDays([...days])} className="font-medium text-accent-text hover:underline">
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
      </FormSection>

      <FormSection title="Retries" description="What happens when a lead doesn't pick up.">
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
      </FormSection>
    </FormPage>
  );
}
