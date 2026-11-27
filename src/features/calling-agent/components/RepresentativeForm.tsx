"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { showSuccessNotification } from "@/hooks/useNotification";
import { Representative, RepresentativeInput, createRepresentative, updateRepresentative } from "@/lib/callingAgentApi";
import {
  Button,
  Field,
  FormPage,
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
  const backHref = "/?tab=calling-agent&callingTab=representatives";
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
      title={rep ? `Edit ${rep.name}` : "Add transfer agent"}
      description="When a lead is interested, the call rings active transfer agents in turn."
      headerLeading={
        <button
          type="button"
          aria-label="Back to Call Transfer"
          title="Back to Call Transfer"
          onClick={() => router.replace(backHref)}
          className="btn-blue-filled mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
      }
      footer={
        <div className="mx-auto grid w-full min-w-0 max-w-sm grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 md:mx-0 md:w-auto md:max-w-none">
          <Button variant="secondary" className="btn-blue h-11 w-full min-w-0 whitespace-normal px-1 text-center text-[11px] leading-tight sm:px-2 sm:text-sm" onClick={() => router.replace(backHref)}>
            Cancel
          </Button>
          <Button className="btn-blue-filled h-11 w-full min-w-0 whitespace-normal px-1 text-center text-[11px] leading-tight sm:px-2 sm:text-sm" onClick={handleSave} disabled={!complete} loading={saving}>
            {rep ? "Save changes" : "Add transfer agent"}
          </Button>
        </div>
      }
      error={error}
    >
      <section className="space-y-3 py-6">
        <h2 className="text-base font-semibold text-heading">Contact</h2>
        <div className="space-y-5 rounded-lg border border-hairline bg-surface p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        </div>
      </section>
      <section className="space-y-3 py-6">
        <h2 className="text-base font-semibold text-heading">Availability</h2>
        <div className="space-y-5 rounded-lg border border-hairline bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-heading">Active</p>
            <p className="text-xs text-muted">Only active transfer agents receive transferred calls.</p>
          </div>
          <Toggle className="[&[aria-checked=true]]:!bg-info" label="Active" checked={form.active} onChange={(active) => setForm((f) => ({ ...f, active }))} />
        </div>
        </div>
      </section>
    </FormPage>
  );
}
