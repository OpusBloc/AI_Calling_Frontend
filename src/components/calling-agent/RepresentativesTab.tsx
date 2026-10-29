"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import {
  Representative,
  RepresentativeInput,
  createRepresentative,
  deleteRepresentative,
  listRepresentatives,
  updateRepresentative,
} from "@/lib/callingAgentApi";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  Loading,
  Drawer,
  Pagination,
  SectionHeader,
  Table,
  TextInput,
  Toggle,
  errorMessage,
  formatDate,
  useLoad,
  usePagination,
} from "./ui";

const EMPTY: RepresentativeInput = { name: "", phone_e164: "", active: true };
// Mirrors the backend check: digits only, optional leading "+", 6–15 digits
const PHONE = /^\+?[0-9]{6,15}$/;

export default function RepresentativesTab() {
  const { data, error, loading, reload } = useLoad(listRepresentatives);
  const [editing, setEditing] = useState<Representative | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reps = data ?? [];
  const pagination = usePagination(reps);

  const run = async (id: string, action: () => Promise<unknown>, success: [title: string, message: string]) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      showSuccessNotification(success[1], { title: success[0] });
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (rep: Representative) => {
    const ok = await confirmDialog({
      title: "Delete Transfer Agent?",
      message: `"${rep.name}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    run(rep.id, () => deleteRepresentative(rep.id), ["Call Transfer Agent deleted", `"${rep.name}" was deleted.`]);
  };

  return (
    <section>
      <SectionHeader
        title="Call Transfer"
        description="People a live call can be transferred to. Campaigns ring active Call Transfer Agent in turn."
        action={
          <Button onClick={() => setEditing("new")} disabled={loading}>
            <Plus size={16} /> Add Transfer Agent
          </Button>
        }
      />

      <div className="space-y-3">
        <ErrorBanner
          message={
            error === "Not Found"
              ? "The backend doesn't have the Call Transfer Agent API yet. Pull the latest backend code and restart it."
              : (error ?? actionError)
          }
        />

        {loading && !data ? (
          <Loading />
        ) : reps.length === 0 && !error ? (
          <EmptyState
            title="No Transfer Agent yet"
            text="Add the people who should take transferred calls."
            action={<Button onClick={() => setEditing("new")}>Add Transfer</Button>}
          />
        ) : reps.length > 0 ? (
          <>
            <Table head={["Name", "Phone", "Status", "Updated", ""]}>
              {pagination.pageItems.map((rep) => (
                <tr key={rep.id}>
                  <td className="px-4 py-3 font-medium text-heading">{rep.name}</td>
                  <td className="px-4 py-3 font-mono text-body">{rep.phone_e164}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Toggle
                        label={`${rep.name} active`}
                        checked={rep.active}
                        disabled={busyId === rep.id}
                        onChange={(active) =>
                          run(rep.id, () => updateRepresentative(rep.id, { active }), [
                            active ? "Transfer activated" : "Transfer deactivated",
                            `"${rep.name}" ${active ? "will now" : "will no longer"} receive transferred calls.`,
                          ])
                        }
                      />
                      <Badge tone={rep.active ? "gain" : "neutral"}>{rep.active ? "Active" : "Inactive"}</Badge>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(rep.updated_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <IconButton label="Edit Transfer" onClick={() => setEditing(rep)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        label="Delete Transfer"
                        tone="danger"
                        disabled={busyId === rep.id}
                        onClick={() => handleDelete(rep)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination {...pagination} noun="representatives" />
          </>
        ) : null}
      </div>

      {editing && (
        <RepresentativeForm
          rep={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}
    </section>
  );
}

function RepresentativeForm({
  rep,
  onClose,
  onSaved,
}: {
  rep: Representative | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<RepresentativeInput>(rep ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phone = form.phone_e164.replace(/[\s()-]/g, "");
  const phoneValid = PHONE.test(phone);
  const complete = form.name.trim() && phoneValid;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const body = { ...form, name: form.name.trim(), phone_e164: phone };
    try {
      if (rep) await updateRepresentative(rep.id, body);
      else await createRepresentative(body);
      showSuccessNotification(`"${body.name}" was ${rep ? "updated" : "added"}.`, {
        title: rep ? "Transfer saved" : "Transfer added",
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Drawer
      title={rep ? "Edit Transfer" : "Add Transfer"}
      description="Transferred calls ring active Transfer in turn."
      onClose={onClose}
      footer={
        <>
          <Button onClick={handleSave} disabled={!complete || saving}>
            {saving ? "Saving…" : rep ? "Save changes" : "Add Transfer"}
          </Button>
        </>
      }
    >
      <ErrorBanner message={error} />

      <Field label="Name">
        <TextInput
          value={form.name}
          maxLength={255}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Priya Sharma"
        />
      </Field>
      <Field
        label="Phone number"
        hint={
          form.phone_e164 && !phoneValid
            ? "Enter 6–15 digits, optionally starting with +, e.g. +919876543210."
            : "Include the country code, e.g. +919876543210."
        }
      >
        <TextInput
          type="tel"
          value={form.phone_e164}
          onChange={(e) => setForm((f) => ({ ...f, phone_e164: e.target.value }))}
          placeholder="+919876543210"
        />
      </Field>
      <div className="flex items-center justify-between rounded-md bg-raised px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-heading">Active</p>
          <p className="text-xs text-muted">Only active Call Transfer Agent receive's transferred calls.</p>
        </div>
        <Toggle label="Active" checked={form.active} onChange={(active) => setForm((f) => ({ ...f, active }))} />
      </div>
    </Drawer>
  );
}
