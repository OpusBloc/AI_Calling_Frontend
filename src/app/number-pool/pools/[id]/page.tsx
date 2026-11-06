"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Gauge, Megaphone, Pencil, Phone, Settings, Trash2 } from "lucide-react";

import { useAvailablePlivoNumbers, useCampaigns, useDeletePlivoPool, usePlivoNumbers, usePlivoPool, usePlivoPools } from "@/hooks/hooks";
import { patchPlivoNumber } from "@/lib/api";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import PageHeader from "@/components/PageHeader";
import { deletePoolMessage } from "@/components/number-pool/pools-tab";
import type { PlivoHealthStatus, PlivoNumber, PlivoNumberUpdate } from "@/types/types";
import {
  Badge,
  Button,
  Card,
  ChipList,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Select,
  Skeleton,
  StatTile,
  StatusBadge,
  Table,
  TextInput,
} from "@/components/ui";
import { useEffect, useState } from "react";

const HEAD = ["Plivo number", "Type and location", "Capabilities", "Health and usage", "Limits", ""];
const HEALTH_STATUSES: PlivoHealthStatus[] = ["unknown", "healthy", "degraded", "unhealthy"];

export default function PlivoPoolPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Confirm the ID exists via the list so a bad link reads "not found", not an error
  const pools = usePlivoPools();
  const exists = pools.data?.some((p) => p.id === id) ?? false;
  const poolQuery = usePlivoPool(exists ? id : "");
  const numbers = usePlivoNumbers();
  const availableNumbers = useAvailablePlivoNumbers(exists ? id : undefined);
  const campaigns = useCampaigns();
  const remove = useDeletePlivoPool();
  const [editingNumber, setEditingNumber] = useState<PlivoNumber | null>(null);

  const pool = poolQuery.data ?? pools.data?.find((p) => p.id === id);
  const crumbs = [{ label: "Number Pool", href: "/number-pool" }, { label: pool?.name ?? "Plivo pool" }];

  if (pools.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title={<Skeleton className="h-8 w-56" />} />
        <Loading label="Loading pool" />
      </div>
    );
  }

  if (pools.isError || poolQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title="Plivo pool" />
        <ErrorState
          message={((pools.error ?? poolQuery.error) as Error).message}
          onRetry={() => (pools.isError ? pools.refetch() : poolQuery.refetch())}
        />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="space-y-6">
        <PageHeader breadcrumbs={crumbs} title="Pool not found" />
        <EmptyState
          title="This pool doesn't exist"
          text="It may have been deleted, or the link is wrong."
          action={<Button onClick={() => router.push("/number-pool")}>Back to pools</Button>}
        />
      </div>
    );
  }

  const details = new Map((numbers.data ?? []).map((n) => [n.phone_e164, n]));
  const usedBy = (campaigns.data ?? []).filter((c) => c.plivo_pool_ids.includes(pool.id));

  const handleDelete = async () => {
    const ok = await confirmDialog({ title: "Delete Plivo pool?", message: deletePoolMessage(pool.name), confirmLabel: "Delete pool" });
    if (!ok) return;
    remove.mutate(pool.id, {
      onSuccess: () => {
        showSuccessNotification(`"${pool.name}" was deleted.`, { title: "Pool deleted" });
        router.replace("/number-pool");
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={crumbs}
        title={pool.name}
        meta={<StatusBadge status={pool.status} />}
        description={`Created ${new Date(pool.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })} · Updated ${new Date(pool.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })}`}
        actions={
          <>
            <Button variant="secondary" onClick={handleDelete} loading={remove.isPending} className="text-loss">
              <Trash2 size={16} aria-hidden /> Delete
            </Button>
            <Button onClick={() => router.push(`/number-pool/pools/${pool.id}/edit`)}>
              <Pencil size={16} aria-hidden /> Edit pool
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Numbers" value={pool.phone_numbers.length} icon={<Phone size={16} />} />
        <StatTile label="Concurrency limit" value={pool.concurrency_limit} icon={<Gauge size={16} />} hint="Calls this pool can carry at once" />
        <StatTile label="Used by campaigns" value={campaigns.isLoading ? "—" : usedBy.length} icon={<Megaphone size={16} />} />
      </div>

      <Card flush title="Numbers" description="Plivo numbers in this pool. Calls are placed from these as the caller ID.">
        {pool.phone_numbers.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No numbers in this pool" text="Edit the pool to add numbers." action={<Button onClick={() => router.push(`/number-pool/pools/${pool.id}/edit`)}>Add numbers</Button>} />
          </div>
        ) : (
          <Table bare head={HEAD} label="Pool numbers">
            {pool.phone_numbers.map((phone) => {
              const n = details.get(phone);
              const availability = availableNumbers.data?.find((candidate) => candidate.phone_e164 === phone);
              const location = n?.region && n.country && !n.region.toLowerCase().includes(n.country.toLowerCase())
                ? `${n.region}, ${n.country}`
                : n?.region || n?.country || "—";
              return (
                <tr key={phone}>
                  <td className="min-w-[190px] px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tnum whitespace-nowrap font-medium text-heading">{phone}</span>
                      {n && !n.active && <Badge tone="warn">Inactive</Badge>}
                    </div>
                    <p className="mt-1 max-w-[190px] truncate text-xs text-muted" title={n?.alias ?? undefined}>
                      {n?.alias || "No alias"}
                    </p>
                  </td>
                  <td className="min-w-[145px] px-3 py-3">
                    <p className="capitalize text-body">{n?.number_type ?? "—"}</p>
                    <p className="mt-1 max-w-[160px] truncate text-xs text-muted" title={location}>{location}</p>
                  </td>
                  <td className="min-w-[100px] px-3 py-3">
                    {n ? (
                      <span className="flex flex-wrap gap-1">
                        <Badge tone={n.voice_enabled ? "gain" : "neutral"}>{n.voice_enabled ? "Voice" : "No voice"}</Badge>
                        {n.sms_enabled && <Badge tone="info">SMS</Badge>}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="min-w-[170px] px-3 py-3">
                    {availability ? (
                      <div className="space-y-1">
                        <Badge tone={availability.health_status === "healthy" ? "gain" : availability.health_status === "unhealthy" ? "warn" : "neutral"}>
                          {availability.health_status.replace("_", " ")}
                        </Badge>
                        <div className="flex flex-wrap gap-x-2 text-xs text-muted">
                          <span>{availability.attempts_today}/{availability.daily_attempt_limit} attempts</span>
                          <span>{availability.active_calls}/{availability.max_concurrent_calls} calls</span>
                        </div>
                      </div>
                    ) : availableNumbers.isLoading ? (
                      <span className="text-xs text-muted">Loading…</span>
                    ) : (
                      <Badge tone={n?.health_status === "unhealthy" ? "warn" : "neutral"}>
                        {(n?.health_status ?? "Unavailable").replace("_", " ")}
                      </Badge>
                    )}
                  </td>
                  <td className="min-w-[130px] px-3 py-3">
                    <p className="tnum text-sm font-medium text-heading">{n?.daily_attempt_limit ?? "—"} <span className="font-normal text-muted">daily</span></p>
                    <p className="tnum mt-1 text-xs text-muted">{n?.max_concurrent_calls ?? "—"} concurrent</p>
                  </td>
                  <td className="w-px whitespace-nowrap px-3 py-2">
                    {n && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className=" p-0"
                        aria-label={`Settings for ${phone}`}
                        title={`Settings for ${phone}`}
                        onClick={() => setEditingNumber(n)}
                      >
                        <Settings size={16} aria-hidden />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
        {availableNumbers.isError && (
          <div className="p-4">
            <ErrorState
              title="Couldn't load number availability"
              message={(availableNumbers.error as Error).message}
              onRetry={() => void availableNumbers.refetch()}
            />
          </div>
        )}
      </Card>

      <Card title="Used by campaigns">
        <ChipList
          empty="No campaign uses this pool yet."
          items={usedBy.map((c) => ({ key: c.id, label: c.name, href: `/campaigns/${c.id}` }))}
        />
      </Card>

      {editingNumber && (
        <PlivoNumberSettingsDrawer
          number={editingNumber}
          onClose={() => setEditingNumber(null)}
        />
      )}
    </div>
  );
}

function PlivoNumberSettingsDrawer({
  number,
  onClose,
}: {
  number: PlivoNumber;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const updateNumber = useMutation({
    mutationFn: ({ phoneE164, body }: { phoneE164: string; body: PlivoNumberUpdate }) =>
      patchPlivoNumber(phoneE164, body),
    onSuccess: async (updated) => {
      queryClient.setQueryData<PlivoNumber[]>(["plivo-numbers"], (numbers) =>
        numbers?.map((number) => number.phone_e164 === updated.phone_e164 ? updated : number),
      );
      await queryClient.invalidateQueries({ queryKey: ["plivo-pools"] });
    },
  });
  const [dailyLimit, setDailyLimit] = useState(String(number.daily_attempt_limit));
  const [maxConcurrent, setMaxConcurrent] = useState(String(number.max_concurrent_calls));
  const [healthStatus, setHealthStatus] = useState<PlivoHealthStatus>(number.health_status);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setDailyLimit(String(number.daily_attempt_limit));
    setMaxConcurrent(String(number.max_concurrent_calls));
    setHealthStatus(number.health_status);
  }, [number]);

  const save = () => {
    const daily = Number(dailyLimit);
    const concurrent = Number(maxConcurrent);
    if (!Number.isInteger(daily) || daily < 0 || !Number.isInteger(concurrent) || concurrent < 1) {
      setValidationError("Enter a whole number: daily limit must be 0 or greater and max concurrent must be at least 1.");
      return;
    }
    setValidationError(null);
    const body: PlivoNumberUpdate = {
      daily_attempt_limit: daily,
      max_concurrent_calls: concurrent,
      health_status: healthStatus,
    };
    updateNumber.mutate(
      { phoneE164: number.phone_e164, body },
      {
        onSuccess: () => {
          showSuccessNotification(`${number.phone_e164} settings were updated.`, { title: "Number updated" });
          onClose();
        },
      },
    );
  };

  return (
    <Drawer
      title="Number settings"
      description={number.phone_e164}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={updateNumber.isPending}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Daily attempt limit" hint="Set to 0 to prevent new attempts from this number.">
          <TextInput type="number" min={0} step={1} value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} />
        </Field>
        <Field label="Max concurrent calls">
          <TextInput type="number" min={1} step={1} value={maxConcurrent} onChange={(event) => setMaxConcurrent(event.target.value)} />
        </Field>
        <Field label="Health status">
          <Select value={healthStatus} onChange={(event) => setHealthStatus(event.target.value as PlivoHealthStatus)}>
            {HEALTH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </Select>
        </Field>
        {validationError && <p role="alert" className="text-sm text-loss">{validationError}</p>}
        {updateNumber.isError && <p role="alert" className="text-sm text-loss">{(updateNumber.error as Error).message}</p>}
      </div>
    </Drawer>
  );
}
