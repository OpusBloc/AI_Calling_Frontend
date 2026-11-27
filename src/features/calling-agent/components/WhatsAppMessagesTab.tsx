"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, History, MessageSquare } from "lucide-react";

import {
  getWhatsAppDelivery,
  listWhatsAppDeliveries,
  type WhatsAppDelivery,
} from "@/lib/callingAgentApi";
import { useWhatsAppMessages } from "@/hooks/hooks";
import { setApiRequestInUrl } from "@/lib/apiUrlState";
import {
  Button,
  Badge,
  Drawer,
  EmptyState,
  ErrorState,
  SectionHeader,
  Table,
  errorMessage,
  formatDate,
} from "@/components/ui";
import { DeliveryDetailSkeleton, DeliveryListSkeleton, SkeletonBoundary, TableSkeleton } from "@/components/skeletons";
import { TEMPLATE_COLUMNS } from "@/components/skeletons/table-columns";

type DeliveryView = { kind: "all" } | { kind: "message"; messageId: string };

const deliveryTone = (status: string): "gain" | "info" | "warn" | "loss" | "neutral" => {
  if (["read", "delivered", "sent", "accepted"].includes(status.toLowerCase())) return "gain";
  if (["queued", "sending", "processing"].includes(status.toLowerCase())) return "info";
  if (["failed", "undelivered", "canceled", "cancelled"].includes(status.toLowerCase())) return "loss";
  return "neutral";
};

export default function WhatsAppMessagesTab() {
  const router = useRouter();
  const { data, error, isLoading, refetch } = useWhatsAppMessages();

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

  return (
    <section className="blue-fields">
      <SectionHeader
        title="WhatsApp messages"
        leading={(
          <button
            type="button"
            aria-label="Back to Calling Agent"
            title="Back to Calling Agent"
            onClick={() => router.push("/?tab=calling-agent")}
            className="btn-blue-filled inline-flex size-10 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
        )}
        description="Template messages agents can send to the customer during or after a call. Attach them to an agent."
        action={
          <Button variant="secondary" className="btn-blue" onClick={openDeliveryActivity}>
            <History size={16} aria-hidden /> Delivery activity
          </Button>
        }
      />

      <div className="space-y-3">
        {error && !data ? (
          <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
        ) : isLoading && !data ? (
          <Table head={TEMPLATE_COLUMNS.map((column) => column.label)} columns={TEMPLATE_COLUMNS} className="blue-table" loading skeleton={<TableSkeleton columns={TEMPLATE_COLUMNS} />}>
          </Table>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={20} />}
            title="No WhatsApp messages"
            text="WhatsApp message templates will appear here when available."
          />
        ) : (
          <>
            <div className="no-scrollbar max-h-[480px] overflow-y-auto overscroll-contain md:max-h-[340px]">
              <Table head={TEMPLATE_COLUMNS.map((column) => column.label)} columns={TEMPLATE_COLUMNS} label="WhatsApp messages" className="blue-table">
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium text-heading">{m.name}</td>
                    <td className="px-4 py-3 text-body">{m.template_id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {m.updated_at
                        ? new Date(m.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" })
                        : "-"}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
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
            {deliveryId && (
              <Button size="sm" variant="secondary" className="btn-blue" onClick={backToDeliveries}>
                Back to deliveries
              </Button>
            )}
            <SkeletonBoundary
              loading={deliveryId ? delivery.isLoading : deliveries.isLoading}
              skeleton={deliveryId ? <DeliveryDetailSkeleton /> : <DeliveryListSkeleton />}
            >
              {deliveryId ? (
                delivery.isError ? (
                  <ErrorState title="Couldn't load delivery" message={errorMessage(delivery.error)} onRetry={() => void delivery.refetch()} />
                ) : delivery.data ? (
                  <DeliveryDetails
                    delivery={delivery.data}
                    content={messages.find((message) => message.id === delivery.data.whatsapp_message_id)?.content ?? messages.find((message) => message.template_id === delivery.data.template_id)?.content ?? "Content unavailable."}
                  />
                ) : null
              ) : deliveries.isError ? (
                <ErrorState title="Couldn't load deliveries" message={errorMessage(deliveries.error)} onRetry={() => void deliveries.refetch()} />
              ) : !deliveries.data?.length ? (
                <p className="rounded-md border border-hairline bg-raised p-5 text-center text-sm text-muted">No WhatsApp deliveries found.</p>
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
            </SkeletonBoundary>
          </div>
        </Drawer>
      )}
    </section>
  );
}

function DeliveryDetails({ delivery, content }: { delivery: WhatsAppDelivery; content: string }) {
  const timestamps: Array<{ label: string; value: string }> = [
    { label: "Accepted", value: delivery.accepted_at ?? "" },
    { label: "Sent", value: delivery.sent_at ?? "" },
    { label: "Delivered", value: delivery.delivered_at ?? "" },
    { label: "Read", value: delivery.read_at ?? "" },
    { label: "Failed", value: delivery.failed_at ?? "" },
  ].filter((entry) => entry.value.length > 0);

  return (
    <div className="space-y-4 rounded-md border border-hairline bg-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-heading">{delivery.message_name || delivery.template_id}</h3>
        <Badge tone={deliveryTone(delivery.status)}>{delivery.status}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <DeliveryField label="Recipient" value={delivery.recipient} />
        <DeliveryField label="Template ID" value={delivery.template_id} />
        <DeliveryField label="Twilio message SID" value={delivery.twilio_message_sid || "-"} />
        <DeliveryField label="Created" value={formatDate(delivery.created_at)} />
        <DeliveryField label="Updated" value={formatDate(delivery.updated_at)} />
      </dl>
      {timestamps.length > 0 && (
        <div className="border-t border-hairline pt-4">
          <h3 className="text-sm font-medium text-heading">Timeline</h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {timestamps.map(({ label, value }) => <DeliveryField key={label} label={label} value={formatDate(value)} />)}
          </dl>
        </div>
      )}
      <div className="border-t border-hairline pt-4">
        <p className="text-xs text-muted">Content</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-heading">{content}</p>
      </div>
      {(delivery.error_code || delivery.error_message) && (
        <div role="alert" className="border-t border-loss/30 pt-4 text-sm text-loss">
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
