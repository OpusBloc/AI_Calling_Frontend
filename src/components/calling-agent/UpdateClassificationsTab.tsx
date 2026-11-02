// src/components/calling-agent/UpdateClassificationsTab.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui";
import { confirmDialog } from "@/components/ConfirmDialog";
import { showSuccessNotification } from "@/hooks/useNotification";
import {
  useAgents,
  useClassifications,
  useCreateClassification,
  useDeleteClassification,
  useUpdateClassification,
} from "@/hooks/hooks";
import type { Classification } from "@/lib/callingAgentApi";
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

function validate(name: string, description: string) {
  if (!name.trim() || name.trim().length > 100) return "Name must be 1–100 characters.";
  if (!description.trim() || description.trim().length > 2000) return "Description must be 1–2000 characters.";
  return null;
}

type FormState = { mode: "create" } | { mode: "edit"; item: Classification } | null;

/** One form for POST (create) and PATCH (edit) */
function ClassificationForm({
  agentId,
  state,
  onClose,
}: {
  agentId: string;
  state: NonNullable<FormState>;
  onClose: () => void;
}) {
  const create = useCreateClassification();
  const update = useUpdateClassification();
  const editing = state.mode === "edit";

  const [name, setName] = useState(editing ? state.item.name : "");
  const [description, setDescription] = useState(editing ? state.item.description : "");
  const [localError, setLocalError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;
  const error = localError ?? (create.error ?? update.error)?.message ?? null;

  function submit() {
    const v = validate(name, description);
    if (v) return setLocalError(v);
    setLocalError(null);
    const body = { name: name.trim(), description: description.trim() };
    if (state.mode === "edit") {
      update.mutate(
        { agentId, id: state.item.id, body },
        {
          onSuccess: () => {
            showSuccessNotification(`"${body.name}" was updated.`, { title: "Classification saved" });
            onClose();
          },
        }
      );
    } else {
      create.mutate(
        { agentId, body },
        {
          onSuccess: () => {
            showSuccessNotification(`"${body.name}" was added.`, { title: "Classification added" });
            onClose();
          },
        }
      );
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#e6dcc3] bg-[#fdfbf6] p-5">
      <h3 className="text-base font-semibold text-[#1b1b2f]">
        {editing ? "Edit classification" : "New classification"}
      </h3>
      <div className="max-w-xl">
        <label className={labelCls}>Name</label>
        <input
          className={fieldCls}
          placeholder="e.g. Interested"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-[#8f8566]">
          <p>Tell the model in plain words when a call belongs here.</p>
          <span>{description.length}/2000</span>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending}>
          <Check size={16} aria-hidden /> {pending ? "Saving…" : editing ? "Save changes" : "Add classification"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          <X size={16} aria-hidden /> Cancel
        </Button>
      </div>
    </div>
  );
}

export default function UpdateClassificationsTab() {
  const agents = useAgents();
  const [agentId, setAgentId] = useState("");
  const summary = useClassifications(agentId);
  const remove = useDeleteClassification();

  const [form, setForm] = useState<FormState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calls drawer state
  const [viewingCalls, setViewingCalls] = useState<{
    classificationId?: string | null;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (!agentId && agents.data?.length) setAgentId(agents.data[0].id);
  }, [agents.data, agentId]);

  useEffect(() => {
    setForm(null);
    setPage(1);
    setViewingCalls(null);
  }, [agentId]);

  const rows = useMemo(() => summary.data?.classifications ?? [], [summary.data?.classifications]);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const visible = useMemo(() => rows.slice(start, start + pageSize), [rows, start, pageSize]);

  async function del(item: Classification) {
    const ok = await confirmDialog({
      title: "Delete classification?",
      message: `Delete "${item.name}"? Its ${item.calls} call(s) will become unclassified.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    remove.mutate(
      { agentId, id: item.id },
      {
        onSuccess: () => {
          showSuccessNotification(`"${item.name}" was deleted.`, { title: "Classification deleted" });
        },
      }
    );
  }

  return (
    <div className="space-y-5">
      {/* Heading row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#1b1b2f]">Classifications</h2>
          <p className="mt-1 text-sm text-[#8f7a3c]">
            Describe when a call belongs in each group. After every call, its transcript is sorted into one.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {summary.data && (
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
          <Button onClick={() => setForm({ mode: "create" })} disabled={!agentId}>
            <Plus size={16} aria-hidden /> New classification
          </Button>
        </div>
      </div>

      {/* Agent picker */}
      <div className="max-w-xs">
        <label htmlFor="classification-agent" className={labelCls}>
          Agent
        </label>
        <select
          id="classification-agent"
          className={fieldCls}
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
        >
          {agents.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {agents.isError && <p className="mt-1 text-sm text-red-600">{agents.error.message}</p>}
      </div>

      {form && (
        <ClassificationForm
          key={form.mode === "edit" ? form.item.id : "new"}
          agentId={agentId}
          state={form}
          onClose={() => setForm(null)}
        />
      )}

      {remove.error && (
        <p role="alert" className="text-sm text-red-600">
          {remove.error.message}
        </p>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-[#e6dcc3] bg-[#fdfbf6]">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-[#efe7d2]">
              <th className={`${thCls} w-[20%]`}>Name</th>
              <th className={`${thCls} w-[40%]`}>Description</th>
              <th className={`${thCls} w-[10%]`}>Calls</th>
              <th className={`${thCls} w-[20%]`}>Updated</th>
              <th className={`${thCls} w-[10%]`}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-[#8f8566]">
                  Loading…
                </td>
              </tr>
            )}
            {summary.isError && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-red-600">
                  {summary.error.message}
                </td>
              </tr>
            )}
            {summary.data && total === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-sm text-[#8f8566]">
                  No classifications yet for this agent. Use “New classification” to add one.
                </td>
              </tr>
            )}
            {visible.map((c) => (
              <tr key={c.id} className="border-b border-[#f1eadb] last:border-0 hover:bg-[#f9f4e8]">
                <td className="px-5 py-4 align-top text-sm font-semibold text-[#1b1b2f]">{c.name}</td>
                <td className="px-5 py-4 align-top text-sm text-[#6b6450]">
                  <p className="line-clamp-2 whitespace-pre-wrap">{c.description}</p>
                </td>
                <td className="px-5 py-4 align-top text-sm text-[#6b6450]">
                  {c.calls > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setViewingCalls({
                          classificationId: c.id,
                          title: `Calls: ${c.name}`,
                        })
                      }
                      className="font-medium text-[#8f7a3c] underline hover:text-[#1b1b2f]"
                      title="View calls sorted into this classification"
                    >
                      {c.calls}
                    </button>
                  ) : (
                    0
                  )}
                </td>
                <td className="px-5 py-4 align-top text-sm text-[#a08a4a]">{formatDate(c.updated_at)}</td>
                <td className="px-5 py-4 align-top">
                  <div className="flex justify-end gap-3 text-[#8f8566]">
                    <button
                      type="button"
                      onClick={() => setForm({ mode: "edit", item: c })}
                      aria-label={`Edit ${c.name}`}
                      className="hover:text-[#1b1b2f]"
                    >
                      <Pencil size={16} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => del(c)}
                      disabled={remove.isPending}
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

      {/* Footer */}
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
