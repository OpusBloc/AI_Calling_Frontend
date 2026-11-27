// src/components/calling-agent/ClassificationsStep.tsx
"use client";

import { useMemo, useState } from "react";
import { Check, Eye, Pencil, PhoneCall, Plus, X } from "lucide-react";

import { Button, Drawer, ErrorState } from "@/components/ui";
import { AccordionList } from "@/components/AccordionList";
import { ClassificationDetailsSkeleton, ClassificationTableSkeleton, SkeletonBoundary } from "@/components/skeletons";
import { CLASSIFICATION_COLUMNS } from "@/components/skeletons/table-columns";
import { DeleteIconButton } from "@/components/ui/ActionIconButtons";
import { confirmDialog } from "@/components/ConfirmDialog";
import { showSuccessNotification } from "@/hooks/useNotification";
import { setApiRequestInUrl } from "@/lib/apiUrlState";
import {
  useClassifications,
  useClassification,
  useCreateClassification,
  useDeleteClassification,
  useUpdateClassification,
} from "@/hooks/hooks";
import type { Classification } from "@/lib/callingAgentApi";
import type { ClassificationDraftItem } from "@/lib/agentDraft";
import ClassificationCallsDrawer from "./ClassificationCallsDrawer";

const fieldCls =
  "w-full rounded-xl border border-[var(--classification-border)] bg-[var(--classification-surface)] px-3.5 py-2.5 text-sm text-[var(--classification-heading)] " +
  "placeholder:text-[var(--classification-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30";
const labelCls = "mb-1.5 block text-sm font-medium text-[var(--classification-heading)]";
const thCls = "px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--classification-muted)]";

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
  const pageSize = 6;

  const [viewingCalls, setViewingCalls] = useState<{
    classificationId?: string | null;
    title: string;
  } | null>(null);
  const [viewingDetails, setViewingDetails] = useState<string | null>(null);

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

  function openCalls(classificationId: string | null, title: string) {
    if (!agentId) return;
    setViewingCalls({ classificationId, title });
    const callsPath = classificationId
      ? `/api/agents/${encodeURIComponent(agentId)}/classifications/${encodeURIComponent(classificationId)}/calls`
      : `/api/agents/${encodeURIComponent(agentId)}/classifications/unclassified/calls`;
    setApiRequestInUrl({ method: "GET", endpoint: `${callsPath}?page=1&page_size=20` });
  }

  function openDetails(classificationId: string) {
    if (!agentId) return;
    setViewingDetails(classificationId);
    setApiRequestInUrl({
      method: "GET",
      endpoint: `/api/agents/${encodeURIComponent(agentId)}/classifications/${encodeURIComponent(classificationId)}`,
    });
  }

  function closeDetails() {
    setViewingDetails(null);
    setApiRequestInUrl(null);
  }

  function closeCalls() {
    setViewingCalls(null);
    setApiRequestInUrl(null);
  }

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
          <h2 className="text-xl font-semibold text-[var(--classification-heading)]">
            Classifications <span className="ml-2 text-sm font-normal text-[var(--primary)]">optional</span>
          </h2>
          <p className="mt-1 text-sm text-[var(--primary)]">
            Describe when a call belongs in each group. After every call, its transcript is sorted into one.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && summary.data && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--classification-border)] bg-[var(--classification-surface)] px-3 py-1.5 text-xs text-[var(--classification-body)]">
              <span>Total calls: <strong className="text-[var(--classification-heading)]">{summary.data.total_calls}</strong></span>
              <span className="text-[var(--classification-border)]">|</span>
              <button
                type="button"
                onClick={() => openCalls(null, "Unclassified Calls")}
                className="hover:underline text-[var(--primary)] font-medium"
              >
                Unclassified: <strong className="text-[var(--classification-heading)]">{summary.data.unclassified_calls}</strong>
              </button>
            </div>
          )}
          <Button className="btn-blue" onClick={openCreate} disabled={pending}>
            <Plus size={16} aria-hidden /> New classification
          </Button>
        </div>
      </div>

      {/* Form card */}
      {form && (
        <div className="space-y-4 rounded-2xl border border-[var(--classification-border)] bg-[var(--classification-surface)] p-5">
          <h3 className="text-base font-semibold text-[var(--classification-heading)]">
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
            <div className="mt-1 flex items-center justify-between text-xs text-[var(--classification-muted)]">
              <p>Tell the model in plain words when a call belongs here.</p>
              <span>{formDescription.length}/2000</span>
            </div>
          </div>

          {(formError || serverError) && (
            <p role="alert" className="text-sm text-red-600 dark:text-danger">
              {formError ?? serverError}
            </p>
          )}

          <div className="flex gap-2">
            <Button className="btn-blue" onClick={handleSubmit} disabled={pending}>
              <Check size={16} aria-hidden />{" "}
              {pending ? "Saving…" : form.mode === "edit" ? "Save changes" : "Add classification"}
            </Button>
            <Button variant="secondary" className="btn-blue" onClick={closeForm} disabled={pending}>
              <X size={16} aria-hidden /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-[var(--classification-border)] bg-[var(--classification-surface)]">
        <AccordionList loading={!isNew && summary.isLoading} items={visible.map((c) => ({
          id: c.id,
          avatar: c.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join(""),
          title: c.name,
          subtitle: c.updated_at ? formatDate(c.updated_at) : "In draft",
          badge: <span className="rounded-full bg-raised px-2 py-1 text-xs text-muted">{isNew ? "In draft" : `${c.calls ?? 0} calls`}</span>,
          keyValue: { label: "Calls", value: c.calls ?? 0 },
          details: [
            { label: "Description", value: c.description, fullWidth: true },
            { label: "Calls", value: c.calls ?? 0 },
            { label: isNew ? "Status" : "Updated", value: isNew ? "In draft" : c.updated_at ? formatDate(c.updated_at) : "-" },
          ],
          actions: [
            ...(!isNew ? [{ label: "View details", onClick: () => openDetails(c.id) }] : []),
            { label: "Edit", onClick: () => openEdit(c) },
            { label: "Delete", onClick: () => handleDelete(c), danger: true, disabled: pending },
          ],
        }))} empty={!isNew && summary.isError ? summary.error.message : "No classifications yet. Use ‘New classification’ to add one, or continue without them."} />
        <table className="hidden w-full table-fixed border-collapse md:table">
          <colgroup>{CLASSIFICATION_COLUMNS.map((column, index) => <col key={column.label || index} style={{ width: column.width }} />)}</colgroup>
          <thead>
            <tr className="border-b border-[var(--classification-divider)]">
              <th className={thCls}>Name</th>
              <th className={thCls}>Description</th>
              <th className={thCls}>Calls</th>
              <th className={thCls}>{isNew ? "Status" : "Updated"}</th>
              <th className={thCls}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <SkeletonBoundary as="tbody" loading={!isNew && summary.isLoading} skeleton={<ClassificationTableSkeleton />} announcement={<tr className="sr-only"><td colSpan={5}>Loading…</td></tr>}>
            {!isNew && summary.isError && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-red-600 dark:text-danger">
                  {summary.error.message}
                </td>
              </tr>
            )}
            {total === 0 && (!isNew ? !summary.isLoading : true) && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-[var(--classification-muted)]">
                  No classifications yet. Use “New classification” to add one, or continue without them.
                </td>
              </tr>
            )}
            {visible.map((c) => (
              <tr key={c.id} className="border-b border-[var(--classification-divider)] last:border-0 hover:bg-[var(--classification-divider)]">
                <td className="break-words px-5 py-4 align-top text-sm font-semibold text-[var(--classification-heading)] [overflow-wrap:anywhere]">
                  {c.name}
                </td>
                <td className="px-5 py-4 align-top text-sm text-[var(--classification-body)]">
                  <p className="line-clamp-2 whitespace-pre-wrap">{c.description}</p>
                </td>
                <td className="px-5 py-4 align-top text-sm text-[var(--classification-body)]">
                  {c.calls ?? 0}
                </td>
                <td className="px-5 py-4 align-top text-sm text-[var(--classification-link)]">
                  {isNew ? "In draft" : c.updated_at ? formatDate(c.updated_at) : "-"}
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {!isNew && (
                      <button
                        type="button"
                        onClick={() => openDetails(c.id)}
                        aria-label={`View details and calls for ${c.name}`}
                        title="View details and calls"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md p-1 text-[var(--icon-primary)] transition-colors hover:text-[var(--icon-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1"
                      >
                        <span className="relative inline-flex">
                          <Eye size={18} aria-hidden="true" />
                          <PhoneCall size={11} aria-hidden="true" className="absolute -bottom-1 -right-1 rounded-full bg-[var(--classification-surface)]" />
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      aria-label={`Edit ${c.name}`}
                      title="Edit"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md p-1 text-muted transition-colors hover:text-heading"
                    >
                      <Pencil size={18} aria-hidden />
                    </button>
                    <DeleteIconButton
                      onClick={() => handleDelete(c)}
                      disabled={pending}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </SkeletonBoundary>
        </table>
      </div>

      {/* Footer / pagination */}
      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--classification-muted)]">
          <span className="font-mono text-xs">
            {total === 0 ? 0 : start + 1}–{Math.min(start + pageSize, total)} of {total} classifications
          </span>
          {total > 6 && (
            <div className="flex items-center gap-2">
              <Button className="btn-blue-filled" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}>
                Previous
              </Button>
              <span className="min-w-14 text-center text-xs" aria-live="polite">
                {safePage} / {pageCount}
              </span>
              <Button className="btn-blue-filled" onClick={() => setPage(safePage + 1)} disabled={safePage >= pageCount}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {viewingCalls && agentId && (
        <ClassificationCallsDrawer
          agentId={agentId}
          classificationId={viewingCalls.classificationId}
          title={viewingCalls.title}
          onClose={closeCalls}
        />
      )}
      {viewingDetails && agentId && (
        <ClassificationDetailsDrawer
          agentId={agentId}
          classificationId={viewingDetails}
          onClose={closeDetails}
        />
      )}
    </div>
  );
}

function ClassificationDetailsDrawer({
  agentId,
  classificationId,
  onClose,
}: {
  agentId: string;
  classificationId: string;
  onClose: () => void;
}) {
  const classification = useClassification(agentId, classificationId);

  return (
    <Drawer
      title={classification.data?.name ?? "Classification details"}
      description="Classification information and call totals."
      onClose={onClose}
    >
      <SkeletonBoundary loading={classification.isLoading} skeleton={<ClassificationDetailsSkeleton />}>
      {classification.isError ? (
        <ErrorState
          title="Couldn't load classification"
          message={classification.error.message}
          onRetry={() => void classification.refetch()}
        />
      ) : classification.data ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-hairline bg-raised p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-heading">
              {classification.data.description || "No description provided."}
            </p>
          </section>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-hairline p-4">
              <dt className="text-xs text-muted">Classified calls</dt>
              <dd className="mt-1 text-lg font-semibold text-heading">{classification.data.calls}</dd>
            </div>
            <ClassificationDate label="Created" value={classification.data.created_at} />
            <ClassificationDate label="Last updated" value={classification.data.updated_at} />
          </dl>
          {classification.data.calls > 0 && (
            <ClassificationCallsDrawer
              agentId={agentId}
              classificationId={classificationId}
              title={`Calls: ${classification.data.name}`}
              onClose={() => {}}
              embedded
            />
          )}
        </div>
      ) : null}
      </SkeletonBoundary>
    </Drawer>
  );
}

function ClassificationDate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hairline p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-heading">{value ? formatDate(value) : "-"}</dd>
    </div>
  );
}
