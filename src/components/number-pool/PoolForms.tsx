"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PlivoPool } from "@/types/types";
import { useCreatePlivoPool, usePlivoNumbers, useUpdatePlivoPool } from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import MultiSelect from "@/components/MultiSelect";
import { Button, Field, FormPage, FormSection, Select, TextInput, humanize } from "@/components/ui";

export const POOL_STATUSES: PlivoPool["status"][] = ["active", "in_progress", "paused", "completed"];

function StatusSelect<T extends string>({ value, onChange }: { value: T; onChange: (v: T) => void }) {
  return (
    <Field label="Status">
      <Select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {POOL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {humanize(s)}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/**
 * Full-page create/edit for a Plivo pool. The backend sets the pool size from the numbers chosen.
 */
export function PlivoPoolForm({ pool }: { pool: PlivoPool | null }) {
  const router = useRouter();
  const backHref = pool ? `/number-pool/pools/${pool.id}` : "/number-pool";
  const [name, setName] = useState(pool?.name ?? "");
  const [status, setStatus] = useState<PlivoPool["status"]>(pool?.status ?? "active");
  const [selected, setSelected] = useState<string[]>(pool?.phone_numbers ?? []);
  const [submitted, setSubmitted] = useState(false);
  const numbers = usePlivoNumbers();
  const create = useCreatePlivoPool();
  const update = useUpdatePlivoPool();
  const mutation = pool ? update : create;

  // Numbers not in another pool, plus the ones already in this one
  const choices = (numbers.data ?? []).filter((n) => !n.plivo_pool_id || n.plivo_pool_id === pool?.id);
  const nameError = submitted && !name.trim() ? "Give the pool a name." : null;
  const numbersError = submitted && selected.length === 0 ? "Choose at least one number." : null;

  const save = () => {
    setSubmitted(true);
    if (!name.trim() || selected.length === 0) return;
    const body = { name: name.trim(), status, concurrency_limit: pool?.concurrency_limit ?? 1, phone_numbers: selected };
    const done = (saved: PlivoPool) => {
      showSuccessNotification(`"${saved.name}" was ${pool ? "updated" : "created"}.`, {
        title: pool ? "Pool updated" : "Pool created",
      });
      router.replace(`/number-pool/pools/${saved.id}`);
    };
    if (pool) update.mutate({ id: pool.id, body }, { onSuccess: done });
    else create.mutate(body, { onSuccess: done });
  };

  return (
    <FormPage
      breadcrumbs={[
        { label: "Number Pool", href: "/number-pool" },
        ...(pool ? [{ label: pool.name, href: backHref }] : []),
        { label: pool ? "Edit" : "New pool" },
      ]}
      title={pool ? `Edit ${pool.name}` : "New Plivo pool"}
      description="A set of Plivo numbers campaigns can place calls from."
      footer={
        <>
          <Button variant="secondary" onClick={() => router.replace(backHref)}>
            Cancel
          </Button>
          <Button onClick={save} loading={mutation.isPending}>
            {pool ? "Save changes" : "Create pool"}
          </Button>
        </>
      }
    >
      <FormSection title="Details" description="Campaigns pick pools by name, so make it easy to recognise.">
        <Field label="Pool name" required error={nameError}>
          <TextInput value={name} maxLength={255} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mumbai numbers" aria-invalid={!!nameError} />
        </Field>
        <StatusSelect value={status} onChange={setStatus} />
      </FormSection>
      <FormSection
        title="Numbers"
        description="Calls from campaigns using this pool show one of these numbers as caller ID. A number can only be in one pool."
      >
        <MultiSelect
          label="Phone numbers"
          required
          loading={numbers.isLoading}
          options={choices.map((n) => ({ id: n.phone_e164, label: n.phone_e164, detail: n.alias ?? n.region ?? undefined }))}
          selected={selected}
          onChange={setSelected}
          error={numbersError}
          hint={`${choices.length} number${choices.length === 1 ? "" : "s"} available. Numbers already in another pool aren't listed — use “Sync numbers” if one is missing.`}
        />
      </FormSection>
    </FormPage>
  );
}
