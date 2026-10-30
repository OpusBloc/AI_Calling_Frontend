"use client";

import { useState } from "react";
import { PhoneCall } from "lucide-react";

import {
  TestCallResult,
  listAgents,
  listTestCallNumbers,
  listTestCallRepresentatives,
  testCallAgent,
} from "@/lib/callingAgentApi";
import { showSuccessNotification } from "@/hooks/useNotification";
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
  const numbers = useLoad(listTestCallNumbers);
  const reps = useLoad(listTestCallRepresentatives);
  const [agentId, setAgentId] = useState(fixedAgentId ?? "");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  // "" = let the backend choose / ring everyone
  const [fromNumber, setFromNumber] = useState("");
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
          <Button variant="secondary" onClick={onClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          <Button onClick={handleCall} disabled={loading || !agents?.length} loading={calling}>
            {!calling && <PhoneCall size={16} aria-hidden />} {result ? "Call again" : "Start call"}
          </Button>
        </>
      }
    >
      <ErrorBanner message={loadError ?? error} />

      {fixedAgentId ? (
        <Field label="Agent">
          <TextInput value={fixedAgent?.name ?? (loading ? "Loading…" : "")} disabled readOnly />
        </Field>
      ) : (
        <Field label="Agent">
          <Select value={selectedId} onChange={(e) => setAgentId(e.target.value)} disabled={loading || !agents?.length}>
            {loading && <option>Loading…</option>}
            {!loading && !agents?.length && <option value="">No agents yet</option>}
            {agents?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
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

      <Field
        label="Call from"
        hint={numbers.data && numbers.data.length === 0 ? "No active voice numbers — sync numbers on the Number Pool page." : "The Plivo number shown as caller ID."}
      >
        <Select value={fromNumber} onChange={(e) => setFromNumber(e.target.value)} disabled={numbers.loading}>
          <option value="">{numbers.loading ? "Loading…" : "Pick automatically"}</option>
          {numbers.data?.map((n) => (
            <option key={n.phone_e164} value={n.phone_e164}>
              {n.phone_e164}
              {n.alias ? ` · ${n.alias}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Transfer to" hint="Who the agent hands the call to if the person is interested.">
        <Select value={repId} onChange={(e) => setRepId(e.target.value)} disabled={reps.loading}>
          <option value="">{reps.loading ? "Loading…" : "Ring every active transfer agent"}</option>
          {reps.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.phone_e164}
            </option>
          ))}
        </Select>
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
