// src/components/calling-agent/ClassificationsStep.tsx
"use client";

import { useMemo, useState } from "react";
import { Check, Eye, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui";
import { confirmDialog } from "@/components/ConfirmDialog";
import { showSuccessNotification } from "@/hooks/useNotification";
import {
  useClassifications,
  useCreateClassification,
  useDeleteClassification,
  useUpdateClassification,
} from "@/hooks/hooks";
import type { Classification } from "@/lib/callingAgentApi";
import type { ClassificationDraftItem } from "@/lib/agentDraft";
import ClassificationCallsDrawer from "./ClassificationCallsDrawer";

const fieldCls =
  "w-full rounded-xl border border-[#e6dcc3] bg-[#fbf8f0] px-3.5 py-2.5 text-sm text-[#1b1b2f] " +
  "placeholder:text-[#a89c78] focus:outline-none focus:border-[#c9b36b] focus:ring-2 focus:ring-[#c9b36b]/30";
const labelCls = "mb-1.5 block text-sm font-medium text-[#1b1b2f]";
const thCls = "px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-[#8f8566]";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function validate(name: string, description: string, existingNames: string[]) {
  const n = name.trim();
  const d = description.trim();
  if (!n || n.length > 100) return "Name must be 1–100 characters.";
  if (!d || d.length > 2000) return "Description must be 1–2000 characters.";
  const dup = existingNames.some(
    (name) => name.toLowerCase() === n.toLowerCase()
  );
  if (dup) return "A classification with this name already exists.";
  return null;
}

type UnifiedItem = {
  id: string;
  name: string;
  description: string;
  calls?: number;
  updated_at?: string;
};

type FormState = { mode: "create" } | { mode: "edit"; item: UnifiedItem } | null;

interface ClassificationsStepProps {
  agentId: string | null;
  items: ClassificationDraftItem[];
  onChange: (items: ClassificationDraftItem[]) => void;
}

export default function ClassificationsStep({ agentId, items, onChange }: ClassificationsStepProps) {
  const isNew = !agentId;

  // Remote data hooks (only active when agentId is present)
  const summary = useClassifications(agentId ?? "");
  const createRemote = useCreateClassification();
  const updateRemote = useUpdateClassification();
  const deleteRemote = useDeleteClassification();

  const [form, setForm] = useState<FormState>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calls drawer state
  const [viewingCalls, setViewingCalls] = useState<{
    classificationId?: string | null;
    title: string;
  } | null>(null);

  // Unified list of rows
  const allRows: UnifiedItem[] = useMemo(() => {
    if (isNew) {
      return items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        calls: 0,
      }));
    }
    return (summary.data?.classifications ?? []).map((c: Classification) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      calls: c.calls,
      updated_at: c.updated_at,
    }));
  }, [isNew, items, summary.data]);

  const total = allRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const visible = useMemo(() => allRows.slice(start, start + pageSize), [allRows, start, pageSize]);

  const pending = !isNew && (createRemote.isPending || updateRemote.isPending || deleteRemote.isPending);
  const serverError = !isNew ? (createRemote.error ?? updateRemote.error ?? deleteRemote.error)?.message ?? null : null;

  function openCreate() {
    setFormName("");
    setFormDescription("");
    setFormError(null);
    setForm({ mode: "create" });
  }

  function openEdit(item: UnifiedItem) {
    setFormName(item.name);
    setFormDescription(item.description);
    setFormError(null);
    setForm({ mode: "edit", item });
  }

  function closeForm() {
    setForm(null);
    setFormError(null);
  }

  function handleSubmit() {
    const existingOtherNames = allRows
      .filter((r) => form?.mode !== "edit" || r.id !== form.item.id)
      .map((r) => r.name);
    const err = validate(formName, formDescription, existingOtherNames);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);

    const trimmedName = formName.trim();
    const trimmedDesc = formDescription.trim();

    if (isNew) {
      if (form?.mode === "edit") {
        onChange(
          items.map((it) =>
            it.id === form.item.id ? { ...it, name: trimmedName, description: trimmedDesc } : it
          )
        );
        showSuccessNotification(`"${trimmedName}" was updated.`);
      } else {
        onChange([
          ...items,
          { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: trimmedName, description: trimmedDesc },
        ]);
        showSuccessNotification(`"${trimmedName}" was added.`);
      }
      closeForm();
    } else {
      if (form?.mode === "edit") {
        updateRemote.mutate(
          { agentId: agentId!, id: form.item.id, body: { name: trimmedName, description: trimmedDesc } },
          {
            onSuccess: () => {
              showSuccessNotification(`"${trimmedName}" was updated.`, { title: "Classification saved" });
              closeForm();
            },
          }
        );
      } else {
        createRemote.mutate(
          { agentId: agentId!, body: { name: trimmedName, description: trimmedDesc } },
          {
            onSuccess: () => {
              showSuccessNotification(`"${trimmedName}" was added.`, { title: "Classification added" });
              closeForm();
            },
          }
        );
      }
    }
  }

  async function handleDelete(item: UnifiedItem) {
    const ok = await confirmDialog({
      title: "Delete classification?",
      message:
        !isNew && item.calls !== undefined
          ? `Delete "${item.name}"? Its ${item.calls} call(s) will become unclassified.`
          : `Remove "${item.name}" from this agent?`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    if (isNew) {
      onChange(items.filter((it) => it.id !== item.id));
      showSuccessNotification(`"${item.name}" was removed.`);
    } else {
      deleteRemote.mutate(
        { agentId: agentId!, id: item.id },
        {
          onSuccess: () =>
            showSuccessNotification(`"${item.name}" was deleted.`, { title: "Classification deleted" }),
        }
      );
    }
  }

  return (
    <div className="space-y-5">
      {/* Heading row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1b1b2f]">
            Classifications <span className="ml-2 text-sm font-normal text-[#8f7a3c]">optional</span>
          </h2>
          <p className="mt-1 text-sm text-[#8f7a3c]">
            Describe when a call belongs in each group. After every call, its transcript is sorted into one.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && summary.data && (
            <div className="flex items-center gap-2 rounded-xl border border-[#e6dcc3] bg-[#fdfbf6] px-3 py-1.5 text-xs text-[#6b6450]">
              <span>Total calls: <strong className="text-[#1b1b2f]">{summary.data.total_calls}</strong></span>
              <span className="text-[#d8c68d]">|</span>
              <button
                type="button"
                onClick={() =>
                  setViewingCalls({
                    classificationId: null,
                    title: "Unclassified Calls",
                  })
                }
                className="hover:underline text-[#8f7a3c] font-medium"
              >
                Unclassified: <strong className="text-[#1b1b2f]">{summary.data.unclassified_calls}</strong>
              </button>
            </div>
          )}
          <Button onClick={openCreate} disabled={pending}>
            <Plus size={16} aria-hidden /> New classification
          </Button>
        </div>
      </div>

      {/* Form card */}
      {form && (
        <div className="space-y-4 rounded-2xl border border-[#e6dcc3] bg-[#fdfbf6] p-5">
          <h3 className="text-base font-semibold text-[#1b1b2f]">
            {form.mode === "edit" ? "Edit classification" : "New classification"}
          </h3>
          <div className="max-w-xl">
            <label className={labelCls}>Name</label>
            <input
              className={fieldCls}
              placeholder="e.g. Interested"
              maxLength={100}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-w-3xl">
            <label className={labelCls}>Description</label>
            <textarea
              className={`${fieldCls} min-h-[200px] resize-y leading-relaxed`}
              rows={8}
              maxLength={2000}
              placeholder="Customer asks for details, a callback or a site visit"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#8f8566]">
              <p>Tell the model in plain words when a call belongs here.</p>
              <span>{formDescription.length}/2000</span>
            </div>
          </div>

          {(formError || serverError) && (
            <p role="alert" className="text-sm text-red-600">
              {formError ?? serverError}
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={pending}>
              <Check size={16} aria-hidden />{" "}
              {pending ? "Saving…" : form.mode === "edit" ? "Save changes" : "Add classification"}
            </Button>
            <Button variant="secondary" onClick={closeForm} disabled={pending}>
              <X size={16} aria-hidden /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-[#e6dcc3] bg-[#fdfbf6]">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-[#efe7d2]">
              <th className={`${thCls} w-[20%]`}>Name</th>
              <th className={`${thCls} w-[36%]`}>Description</th>
              <th className={`${thCls} w-[10%]`}>Calls</th>
              <th className={`${thCls} w-[14%]`}>{isNew ? "Status" : "Updated"}</th>
              <th className={`${thCls} w-[20%]`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!isNew && summary.isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-[#8f8566]">
                  Loading…
                </td>
              </tr>
            )}
            {!isNew && summary.isError && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-red-600">
                  {summary.error.message}
                </td>
              </tr>
            )}
            {total === 0 && (!isNew ? !summary.isLoading : true) && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-[#8f8566]">
                  No classifications yet. Use “New classification” to add one, or continue without them.
                </td>
              </tr>
            )}
            {visible.map((c) => (
              <tr key={c.id} className="border-b border-[#f1eadb] last:border-0 hover:bg-[#f9f4e8]">
                <td className="break-words px-5 py-4 align-top text-sm font-semibold text-[#1b1b2f] [overflow-wrap:anywhere]">
                  {c.name}
                </td>
                <td className="px-5 py-4 align-top text-sm text-[#6b6450]">
                  <p className="line-clamp-2 whitespace-pre-wrap">{c.description}</p>
                </td>
                <td className="px-5 py-4 align-top text-sm text-[#6b6450]">
                  {c.calls ?? 0}
                </td>
                <td className="px-5 py-4 align-top text-sm text-[#a08a4a]">
                  {isNew ? "In draft" : c.updated_at ? formatDate(c.updated_at) : "—"}
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-wrap justify-end gap-3 text-[#8f8566]">
                    {!isNew && (c.calls ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setViewingCalls({
                            classificationId: c.id,
                            title: `Calls: ${c.name}`,
                          })
                        }
                        aria-label={`View calls for ${c.name}`}
                        title="View calls"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#8f7a3c] hover:text-[#1b1b2f]"
                      >
                        <Eye size={16} aria-hidden />
                        View
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      aria-label={`Edit ${c.name}`}
                      className="hover:text-[#1b1b2f]"
                    >
                      <Pencil size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      disabled={pending}
                      aria-label={`Delete ${c.name}`}
                      className="hover:text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#8f8566]">
          <span className="font-mono text-xs">
            {total === 0 ? 0 : start + 1}–{Math.min(start + pageSize, total)} of {total} classifications
          </span>
          <label className="flex items-center gap-2">
            Rows
            <select
              className="rounded-lg border border-[#e6dcc3] bg-white px-2 py-1 text-sm text-[#1b1b2f]"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {pageCount > 1 && (
            <div className="ml-auto flex items-center gap-2">
              <Button variant="secondary" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>
                Prev
              </Button>
              <span className="text-xs">
                {safePage} / {pageCount}
              </span>
              <Button variant="secondary" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Calls Drawer */}
      {viewingCalls && agentId && (
        <ClassificationCallsDrawer
          agentId={agentId}
          classificationId={viewingCalls.classificationId}
          title={viewingCalls.title}
          onClose={() => setViewingCalls(null)}
        />
      )}
    </div>
  );
}
