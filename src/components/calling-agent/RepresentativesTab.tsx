"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, PhoneForwarded, Plus, Trash2 } from "lucide-react";

import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import {
  Representative,
  deleteRepresentative,
  listRepresentatives,
  updateRepresentative,
} from "@/lib/callingAgentApi";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  ErrorState,
  IconButton,
  SkeletonRows,
  Pagination,
  SectionHeader,
  Table,
  Toggle,
  errorMessage,
  formatDate,
  useLoad,
  usePagination,
} from "@/components/ui";

export default function RepresentativesTab() {
  const { data, error, loading, reload } = useLoad(listRepresentatives);
  const router = useRouter();
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
      title: "Delete transfer agent?",
      message: `"${rep.name}" will be permanently deleted and will stop receiving transferred calls. This cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    run(rep.id, () => deleteRepresentative(rep.id), ["Transfer agent deleted", `"${rep.name}" was deleted.`]);
  };

  return (
    <section>
      <SectionHeader
        title="Call Transfer"
        description="People a live call can be transferred to. Campaigns ring active transfer agents in turn."
        action={
          <Button onClick={() => router.push("/calling-agent/representatives/new")} disabled={loading}>
            <Plus size={16} aria-hidden /> Add transfer agent
          </Button>
        }
      />

      <div className="space-y-3">
        <ErrorBanner
          message={
            error === "Not Found"
              ? "The backend doesn't have the call transfer API yet. Pull the latest backend code and restart it."
              : (error ?? actionError)
          }
        />

        {loading && !data ? (
          <Table head={["Name", "Phone", "Status", "Updated", ""]}>
            <SkeletonRows cols={5} />
          </Table>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : reps.length === 0 ? (
          <EmptyState
            icon={<PhoneForwarded size={20} />}
            title="No transfer agents yet"
            text="Add the people who should take a call when a lead is interested."
            action={<Button onClick={() => router.push("/calling-agent/representatives/new")}>Add transfer agent</Button>}
          />
        ) : reps.length > 0 ? (
          <>
            <Table head={["Name", "Phone", "Status", "Updated", ""]} label="Transfer agents">
              {pagination.pageItems.map((rep) => (
                <tr key={rep.id}>
                  <td className="px-4 py-3 font-medium text-heading">{rep.name}</td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">{rep.phone_e164}</td>
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
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <IconButton label={`Edit ${rep.name}`} onClick={() => router.push(`/calling-agent/representatives/${rep.id}/edit`)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton
                        label={`Delete ${rep.name}`}
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
            <Pagination {...pagination} noun="transfer agents" />
          </>
        ) : null}
      </div>
    </section>
  );
}
