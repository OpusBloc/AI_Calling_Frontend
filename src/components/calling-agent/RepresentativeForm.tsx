"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { showSuccessNotification } from "@/hooks/useNotification";
import { Representative, RepresentativeInput, createRepresentative, updateRepresentative } from "@/lib/callingAgentApi";
import {
  Button,
  Field,
  FormPage,
  FormSection,
  PhoneInput,
  TextInput,
  Toggle,
  errorMessage,
  isValidLocalNumber,
  toE164,
  toLocalNumber,
} from "@/components/ui";

const EMPTY: RepresentativeInput = { name: "", phone_e164: "", active: true };

/**
 * Full-page create/edit (`/calling-agent/representatives/new`, `…/[id]/edit`)
 */
export default function RepresentativeForm({ rep }: { rep: Representative | null }) {
  const router = useRouter();
  const backHref = "/calling-agent?tab=representatives";
  const [form, setForm] = useState<RepresentativeInput>(rep ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [local, setLocal] = useState(() => toLocalNumber(rep?.phone_e164 ?? ""));
  const phone = toE164(local);
  const phoneValid = isValidLocalNumber(local);
  const complete = form.name.trim() && phoneValid;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const body = { ...form, name: form.name.trim(), phone_e164: phone };
    try {
      if (rep) await updateRepresentative(rep.id, body);
      else await createRepresentative(body);
      showSuccessNotification(`"${body.name}" was ${rep ? "updated" : "added"}.`, {
        title: rep ? "Transfer agent saved" : "Transfer agent added",
      });
      router.replace(backHref);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <FormPage
      breadcrumbs={[
        { label: "Calling Agent", href: "/calling-agent" },
        { label: "Call Transfer", href: backHref },
        { label: rep ? rep.name : "New transfer agent" },
      ]}
      title={rep ? `Edit ${rep.name}` : "Add transfer agent"}
      description="When a lead is interested, the call rings active transfer agents in turn."
      footer={
        <>
          <Button variant="secondary" onClick={() => router.replace(backHref)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!complete} loading={saving}>
            {rep ? "Save changes" : "Add transfer agent"}
          </Button>
        </>
      }
      error={error}
    >
      <FormSection title="Contact" description="Who takes the call, and the number their phone rings on.">
        <Field label="Name" required>
          <TextInput
            value={form.name}
            maxLength={255}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Priya Sharma"
          />
        </Field>
        <Field
          label="Phone number"
          required
          error={local && !phoneValid ? "Enter the 10-digit mobile number." : null}
          hint="10-digit mobile number. +91 is added for you."
        >
          <PhoneInput value={local} onChange={setLocal} aria-invalid={!!local && !phoneValid} />
        </Field>
      </FormSection>
      <FormSection title="Availability" description="Turn this off while someone is away; they keep their details.">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-heading">Active</p>
            <p className="text-xs text-muted">Only active transfer agents receive transferred calls.</p>
          </div>
          <Toggle label="Active" checked={form.active} onChange={(active) => setForm((f) => ({ ...f, active }))} />
        </div>
      </FormSection>
    </FormPage>
  );
}
