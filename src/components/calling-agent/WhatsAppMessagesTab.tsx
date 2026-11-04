"use client";

import { useState } from "react";
import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";

import { WhatsAppMessage } from "@/lib/callingAgentApi";
import {
  useCreateWhatsAppMessage,
  useDeleteWhatsAppMessage,
  useUpdateWhatsAppMessage,
  useWhatsAppMessages,
} from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import {
  Button,
  EmptyState,
  ErrorBanner,
  ErrorState,
  IconButton,
  Pagination,
  SectionHeader,
  SkeletonRows,
  Table,
  errorMessage,
  formatDate,
  usePagination,
} from "@/components/ui";

type FormState = { name: string; content: string; template_id: string };
const EMPTY: FormState = { name: "", content: "", template_id: "" };

export default function WhatsAppMessagesTab() {
  const { data, error, isLoading, refetch } = useWhatsAppMessages();
  const createMut = useCreateWhatsAppMessage();
  const updateMut = useUpdateWhatsAppMessage();
  const deleteMut = useDeleteWhatsAppMessage();

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [actionError, setActionError] = useState<string | null>(null);

  const messages = data ?? [];
  const pagination = usePagination(messages);
  const saving = createMut.isPending || updateMut.isPending;
  const canSave =
    form.name.trim() !== "" &&
    form.content.trim() !== "" &&
    form.template_id.trim() !== "" &&
    !saving;

  const openNew = () => {
    setForm(EMPTY);
    setEditingId("new");
    setActionError(null);
  };

  const openEdit = (m: WhatsAppMessage) => {
    setForm({ name: m.name ?? "", content: m.content, template_id: m.template_id });
    setEditingId(m.id);
    setActionError(null);
  };

  const close = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const handleSave = async () => {
    setActionError(null);
    const body = {
      name: form.name.trim(),
      content: form.content.trim(),
      template_id: form.template_id.trim(),
    };
    try {
      if (editingId === "new") {
        await createMut.mutateAsync(body);
        showSuccessNotification("Message created.", { title: "WhatsApp message" });
      } else if (editingId) {
        await updateMut.mutateAsync({ id: editingId, body });
        showSuccessNotification("Message updated.", { title: "WhatsApp message" });
      }
      close();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const handleDelete = async (m: WhatsAppMessage) => {
    const ok = await confirmDialog({
      title: "Delete message?",
      message: `"${m.name || m.template_id}" will be permanently deleted. Agents using it will lose it.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setActionError(null);
    try {
      await deleteMut.mutateAsync(m.id);
      showSuccessNotification("Message was deleted.", { title: "Message deleted" });
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const newButton = (
    <Button onClick={openNew}>
      <Plus size={16} aria-hidden /> New message
    </Button>
  );

  const inputCls =
    "w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-gray-400";

  return (
    <section>
      <SectionHeader
        title="WhatsApp messages"
        description="Template messages agents can send to the customer during or after a call. Attach them to an agent."
        action={newButton}
      />

      <div className="space-y-3">
        <ErrorBanner message={actionError} />

        {editingId && (
          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-heading">
              {editingId === "new" ? "New message" : "Edit message"}
            </h3>
            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="wa-name">
                Name
              </label>
              <input
                id="wa-name"
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Welcome message"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="wa-template">
                Template ID
              </label>
              <input
                id="wa-template"
                className={inputCls}
                value={form.template_id}
                onChange={(e) => setForm({ ...form, template_id: e.target.value })}
                placeholder="e.g. welcome_offer_v1"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted" htmlFor="wa-content">
                Content
              </label>
              <textarea
                id="wa-content"
                className={inputCls}
                rows={5}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Message text"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!canSave}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {error && !data ? (
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        ) : isLoading && !data ? (
          <Table head={["Name", "Template ID", "Content", "Updated", ""]}>
            <SkeletonRows cols={5} />
          </Table>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={20} />}
            title="No WhatsApp messages yet"
            text="Create a message template here, then attach it to an agent."
            action={newButton}
          />
        ) : (
          <>
            <Table head={["Name", "Template ID", "Content", "Updated", ""]} label="WhatsApp messages">
              {pagination.pageItems.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium text-heading">{m.name}</td>
                  <td className="px-4 py-3 text-body">{m.template_id}</td>
                  <td className="max-w-md px-4 py-3 text-body">
                    <span className="line-clamp-2 whitespace-pre-line">{m.content}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {m.updated_at
                      ? new Date(m.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <IconButton label={`Edit ${m.name || m.template_id}`} onClick={() => openEdit(m)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        label={`Delete ${m.name || m.template_id}`}
                        tone="danger"
                        onClick={() => handleDelete(m)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <Pagination {...pagination} noun="messages" />
          </>
        )}
      </div>
    </section>
  );
}