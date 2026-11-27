"use client";

import { useState } from "react";
import { ChevronDown, PhoneCall } from "lucide-react";

import {
  TestCallResult,
  listAgents,
  listTestCallRepresentatives,
  testCallAgent,
} from "@/lib/callingAgentApi";
import { showSuccessNotification } from "@/hooks/useNotification";
import { usePlivoNumberCallStats, usePlivoPools } from "@/hooks/hooks";
import { FieldControlSkeleton, SkeletonBoundary } from "@/components/skeletons";
import { Button, Drawer, ErrorBanner, Field, PhoneInput, Select, TextInput, errorMessage, isValidLocalNumber, toE164, useLoad } from "./ui";

/**
 * Right-side panel that rings a number with the chosen agent
 */
export default function TestCallDrawer({
  agentId: fixedAgentId,
  onClose,
}: {
  /** Lock the drawer to one agent (agent page); omit to pick from the list */
  agentId?: string;
  onClose: () => void;
}) {
  const { data: agents, error: loadError, loading } = useLoad(listAgents);
  const pools = usePlivoPools();
  const callStats = usePlivoNumberCallStats();
  const reps = useLoad(listTestCallRepresentatives);
  const [agentId, setAgentId] = useState(fixedAgentId ?? "");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  // "" = let the backend choose / ring everyone
  const [fromNumber, setFromNumber] = useState("");
  const [poolId, setPoolId] = useState("");
  const [numberMenuOpen, setNumberMenuOpen] = useState(false);
  const [repId, setRepId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<TestCallResult | null>(null);

  const selectedId = agentId || agents?.[0]?.id || "";
  const fixedAgent = fixedAgentId ? agents?.find((a) => a.id === fixedAgentId) : null;

  const handleCall = async () => {
    const number = toE164(phone);
    if (!selectedId) return setError("Choose an agent to test.");
    if (!isValidLocalNumber(phone)) return setError("Enter the 10-digit mobile number.");
    if (poolId && !fromNumber) return setError("Select a caller number from the chosen pool.");
    setCalling(true);
    setError(null);
    try {
      const res = await testCallAgent(selectedId, {
        phone: number,
        name: name.trim() || undefined,
        from_number: fromNumber || undefined,
        representative_id: repId || undefined,
      });
      setResult(res);
      showSuccessNotification(`Calling ${res.to} from ${res.from}.`, { title: "Test call started" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCalling(false);
    }
  };

  return (
    <Drawer
      title="Test call"
      description="Ring a phone now and hear how the agent sounds on a real call."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" className="btn-blue" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          <Button className="btn-blue-filled" onClick={handleCall} disabled={loading || !agents?.length} loading={calling}>
            {!calling && <PhoneCall size={16} aria-hidden />} {result ? "Call again" : "Start call"}
          </Button>
        </>
      }
    >
      <ErrorBanner message={loadError ?? error ?? (pools.error ? errorMessage(pools.error) : null)} />

      {fixedAgentId ? (
        <Field label="Agent">
          <SkeletonBoundary loading={loading} skeleton={<FieldControlSkeleton />}>
            <TextInput value={fixedAgent?.name ?? ""} disabled readOnly />
          </SkeletonBoundary>
        </Field>
      ) : (
        <Field label="Agent">
          <SkeletonBoundary loading={loading} skeleton={<FieldControlSkeleton />}>
            <Select value={selectedId} onChange={(e) => setAgentId(e.target.value)} disabled={!agents?.length}>
              {!agents?.length && <option value="">No agents yet</option>}
              {agents?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </SkeletonBoundary>
        </Field>
      )}

      <Field label="Phone number" required hint="10-digit mobile number. +91 is added for you.">
        <PhoneInput
          autoFocus
          value={phone}
          onChange={setPhone}
          onKeyDown={(e) => e.key === "Enter" && !calling && handleCall()}
        />
      </Field>

      <Field label="Customer name" hint="Optional. The agent may address the person by this name.">
        <TextInput value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul" />
      </Field>

      <Field label="Call from" hint="Choose a Plivo pool, then select the caller number from that pool.">
        <div className="[&_select]:!bg-blue-50 dark:[&_select]:!bg-blue-950 [&_option:checked]:!bg-blue-900 [&_option:checked]:!text-white">
          <SkeletonBoundary loading={pools.isLoading} skeleton={<FieldControlSkeleton />}>
            <Select
              value={poolId}
              onChange={(event) => {
                setPoolId(event.target.value);
                setFromNumber("");
                setNumberMenuOpen(false);
              }}
            >
              <option value="">Pick automatically</option>
              {pools.data?.filter((pool) => pool.status === "active").map((pool) => (
                <option key={pool.id} value={pool.id}>{pool.name}</option>
              ))}
            </Select>
          </SkeletonBoundary>
        </div>
        {poolId && (() => {
          const selectedPool = pools.data?.find((pool) => pool.id === poolId);
          const poolNumbers = selectedPool?.phone_numbers ?? [];
          const selectedNumber = poolNumbers.find((number) => number === fromNumber);
          return (
            <div className="relative mt-2">
              <button
                type="button"
                onClick={() => setNumberMenuOpen((open) => !open)}
                disabled={!poolNumbers.length}
                aria-label="Caller number"
                aria-haspopup="listbox"
                aria-expanded={numberMenuOpen}
                className="flex h-10 w-full items-center justify-between rounded-md border border-hairline-strong bg-blue-50 px-3 text-left text-sm text-heading transition-colors hover:border-[var(--input-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-950"
              >
                <span>{selectedNumber ?? (poolNumbers.length ? "Select a number" : "No numbers in this pool")}</span>
                <ChevronDown size={16} aria-hidden />
              </button>
              {numberMenuOpen && poolNumbers.length > 0 && (
                <div role="listbox" aria-label="Caller numbers" className="absolute bottom-full left-0 z-20 mb-1 max-h-52 w-full overflow-y-auto rounded-md border border-hairline-strong bg-blue-50 p-1 shadow-lg dark:bg-blue-950">
                  {poolNumbers.map((number) => {
                    const totalCalls = callStats.data?.find((stat) => stat.phone_e164 === number)?.total_calls ?? 0;
                    return (
                      <button
                        key={number}
                        type="button"
                        role="option"
                        aria-selected={fromNumber === number}
                        onClick={() => {
                          setFromNumber(number);
                          setNumberMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--input-glow)] ${fromNumber === number ? "bg-blue-900 text-white hover:bg-blue-950 dark:bg-blue-950 dark:hover:bg-blue-900" : "text-heading hover:bg-surface-hover"}`}
                      >
                        <span className="tnum">{number}</span>
                        <span className={`shrink-0 text-right text-xs ${fromNumber === number ? "text-blue-100" : "text-muted"}`}>{callStats.isLoading ? "Loading calls" : `${totalCalls} calls`}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </Field>

      <Field label="Transfer to" hint="Who the agent hands the call to if the person is interested.">
        <SkeletonBoundary loading={reps.loading} skeleton={<FieldControlSkeleton />}>
          <Select value={repId} onChange={(e) => setRepId(e.target.value)}>
            <option value="">Ring every active transfer agent</option>
            {reps.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.phone_e164}
              </option>
            ))}
          </Select>
        </SkeletonBoundary>
      </Field>

      {result && (
        <div className="rounded-md border border-hairline bg-gain-bg px-3 py-3 text-sm">
          <p className="font-medium text-gain">Calling {result.to}</p>
          <p className="mt-1 text-muted">
            From <span className="tnum">{result.from}</span>
            {result.representative_id && reps.data && (
              <> · transfers to {reps.data.find((r) => r.id === result.representative_id)?.name ?? "chosen agent"}</>
            )}
            {result.request_uuid && (
              <>
                {" · "}Request <span className="font-mono text-xs">{result.request_uuid}</span>
              </>
            )}
          </p>
        </div>
      )}
    </Drawer>
  );
}
