"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";

import {
  getWhatsAppDelivery,
  listWhatsAppDeliveries,
  type WhatsAppDelivery,
  type WhatsAppMessage,
} from "@/lib/callingAgentApi";
import {
  useCreateWhatsAppMessage,
  useDeleteWhatsAppMessage,
  useUpdateWhatsAppMessage,
  useWhatsAppMessages,
} from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import { setApiRequestInUrl } from "@/lib/apiUrlState";
import {
  Button,
  Badge,
  Drawer,
  EmptyState,
  ErrorBanner,
  ErrorState,
  IconButton,
  Pagination,
  SectionHeader,
  Skeleton,
  SkeletonRows,
  Table,
  errorMessage,
  usePagination,
  formatDate,
} from "@/components/ui";

type FormState = { name: string; content: string; template_id: string };
const EMPTY: FormState = { name: "", content: "", template_id: "" };
type DeliveryView = { kind: "all" } | { kind: "message"; messageId: string };

const deliveryTone = (status: string): "gain" | "info" | "warn" | "loss" | "neutral" => {
  if (["read", "delivered", "sent", "accepted"].includes(status.toLowerCase())) return "gain";
  if (["queued", "sending", "processing"].includes(status.toLowerCase())) return "info";
  if (["failed", "undelivered", "canceled", "cancelled"].includes(status.toLowerCase())) return "loss";
  return "neutral";
};

export default function WhatsAppMessagesTab() {
  const { data, error, isLoading, refetch } = useWhatsAppMessages();
  const createMut = useCreateWhatsAppMessage();
  const updateMut = useUpdateWhatsAppMessage();
  const deleteMut = useDeleteWhatsAppMessage();

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deliveryView, setDeliveryView] = useState<DeliveryView | null>(null);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const deliveries = useQuery({
    queryKey: ["whatsapp-deliveries", deliveryView],
    queryFn: () =>
      listWhatsAppDeliveries({
        limit: 100,
        messageId: deliveryView?.kind === "message" ? deliveryView.messageId : undefined,
      }),
    enabled: deliveryView !== null,
    retry: false,
  });
  const delivery = useQuery({
    queryKey: ["whatsapp-delivery", deliveryId],
    queryFn: () => {
      if (!deliveryId) throw new Error("Select a delivery first.");
      return getWhatsAppDelivery(deliveryId);
    },
    enabled: !!deliveryId,
    retry: false,
  });

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
  const closeDeliveryView = () => {
    setDeliveryView(null);
    setDeliveryId(null);
    setApiRequestInUrl(null);
  };
  const openDeliveryActivity = () => {
    setDeliveryView({ kind: "all" });
    setDeliveryId(null);
    setApiRequestInUrl({ method: "GET", endpoint: "/api/whatsapp-messages/deliveries?limit=100" });
  };
  const openMessageDeliveries = (messageId: string) => {
    setDeliveryView({ kind: "message", messageId });
    setDeliveryId(null);
    setApiRequestInUrl({
      method: "GET",
      endpoint: `/api/whatsapp-messages/${encodeURIComponent(messageId)}/deliveries?limit=100`,
    });
  };
  const openDeliveryDetails = (id: string) => {
    setDeliveryId(id);
    setApiRequestInUrl({
      method: "GET",
      endpoint: `/api/whatsapp-messages/deliveries/${encodeURIComponent(id)}`,
    });
  };
  const backToDeliveries = () => {
    setDeliveryId(null);
    setApiRequestInUrl(
      deliveryView?.kind === "message"
        ? {
            method: "GET",
            endpoint: `/api/whatsapp-messages/${encodeURIComponent(deliveryView.messageId)}/deliveries?limit=100`,
          }
        : { method: "GET", endpoint: "/api/whatsapp-messages/deliveries?limit=100" },
    );
  };

  const inputCls =
    "w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm text-body focus:outline-none focus:ring-2 focus:ring-gray-400";

  return (
    <section>
      <SectionHeader
        title="WhatsApp messages"
        description="Template messages agents can send to the customer during or after a call. Attach them to an agent."
        action={
          <>
            <Button variant="secondary" onClick={openDeliveryActivity}>
              <History size={16} aria-hidden /> Delivery activity
            </Button>
            {newButton}
          </>
        }
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
          <Table head={["Name", "Template ID", "Content", "Updated", "Deliveries", ""]}>
            <SkeletonRows cols={6} />
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
            <Table head={["Name", "Template ID", "Content", "Updated", "Deliveries", ""]} label="WhatsApp messages">
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
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        openMessageDeliveries(m.id);
                      }}
                    >
                      <History size={14} aria-hidden /> View
                    </Button>
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

      {deliveryView && (
        <Drawer
          title={deliveryId ? "Delivery details" : deliveryView.kind === "all" ? "Delivery activity" : "Message deliveries"}
          description={
            deliveryId
              ? "Status and provider response for this WhatsApp delivery."
              : deliveryView.kind === "all"
                ? "Recent WhatsApp template delivery attempts."
                : `Delivery attempts for ${messages.find((message) => message.id === deliveryView.messageId)?.name ?? "this message"}.`
          }
          onClose={closeDeliveryView}
        >
          <div className="space-y-3">
            {deliveryId ? (
              <>
                <Button size="sm" variant="secondary" onClick={backToDeliveries}>
                  Back to deliveries
                </Button>
                {delivery.isLoading ? (
                  <div className="space-y-2" role="status" aria-label="Loading delivery details">
                    <Skeleton className="h-20 rounded-md" />
                    <Skeleton className="h-28 rounded-md" />
                  </div>
                ) : delivery.isError ? (
                  <ErrorState
                    title="Couldn't load delivery"
                    message={errorMessage(delivery.error)}
                    onRetry={() => void delivery.refetch()}
                  />
                ) : delivery.data ? (
                  <DeliveryDetails delivery={delivery.data} />
                ) : null}
              </>
            ) : deliveries.isLoading ? (
              <div className="space-y-2" role="status" aria-label="Loading deliveries">
                <Skeleton className="h-20 rounded-md" />
                <Skeleton className="h-20 rounded-md" />
              </div>
            ) : deliveries.isError ? (
              <ErrorState
                title="Couldn't load deliveries"
                message={errorMessage(deliveries.error)}
                onRetry={() => void deliveries.refetch()}
              />
            ) : !deliveries.data?.length ? (
              <p className="rounded-md border border-hairline bg-raised p-5 text-center text-sm text-muted">
                No WhatsApp deliveries found.
              </p>
            ) : (
              deliveries.data.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openDeliveryDetails(item.id)}
                  className="w-full rounded-md border border-hairline bg-surface p-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-heading">{item.message_name || item.template_id}</span>
                      <span className="mt-1 block text-xs text-muted">{item.recipient} · {formatDate(item.created_at)}</span>
                    </span>
                    <Badge tone={deliveryTone(item.status)}>{item.status}</Badge>
                  </div>
                  {item.error_message && <span className="mt-2 block line-clamp-2 text-xs text-loss">{item.error_message}</span>}
                </button>
              ))
            )}
          </div>
        </Drawer>
      )}
    </section>
  );
}

function DeliveryDetails({ delivery }: { delivery: WhatsAppDelivery }) {
  const timestamps: Array<{ label: string; value: string }> = [
    { label: "Accepted", value: delivery.accepted_at ?? "" },
    { label: "Sent", value: delivery.sent_at ?? "" },
    { label: "Delivered", value: delivery.delivered_at ?? "" },
    { label: "Read", value: delivery.read_at ?? "" },
    { label: "Failed", value: delivery.failed_at ?? "" },
  ].filter((entry) => entry.value.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-hairline bg-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium text-heading">{delivery.message_name || delivery.template_id}</h3>
          <Badge tone={deliveryTone(delivery.status)}>{delivery.status}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <DeliveryField label="Recipient" value={delivery.recipient} />
          <DeliveryField label="Template ID" value={delivery.template_id} />
          <DeliveryField label="Twilio message SID" value={delivery.twilio_message_sid || "—"} />
          <DeliveryField label="Attempt ID" value={delivery.attempt_id || "—"} />
          <DeliveryField label="Created" value={formatDate(delivery.created_at)} />
          <DeliveryField label="Updated" value={formatDate(delivery.updated_at)} />
        </dl>
      </div>
      {timestamps.length > 0 && (
        <div className="rounded-md border border-hairline p-4">
          <h3 className="text-sm font-medium text-heading">Timeline</h3>
          <dl className="mt-3 space-y-2">
            {timestamps.map(({ label, value }) => <DeliveryField key={label} label={label} value={formatDate(value)} />)}
          </dl>
        </div>
      )}
      {(delivery.error_code || delivery.error_message) && (
        <div role="alert" className="rounded-md border border-loss/30 bg-loss-bg p-4 text-sm text-loss">
          {delivery.error_code && <p className="font-medium">Error {delivery.error_code}</p>}
          {delivery.error_message && <p className="mt-1 whitespace-pre-wrap">{delivery.error_message}</p>}
        </div>
      )}
    </div>
  );
}

function DeliveryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 break-all text-sm text-heading">{value}</dd>
    </div>
  );
}