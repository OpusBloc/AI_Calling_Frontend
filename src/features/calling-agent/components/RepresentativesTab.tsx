"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, PhoneForwarded, Plus } from "lucide-react";

import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import { DeleteIconButton } from "@/components/ui/ActionIconButtons";
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
  SearchInput,
  SectionHeader,
  Table,
  TableMessage,
  Toggle,
  errorMessage,
  formatDate,
  usePagination,
} from "@/components/ui";
import { TableSkeleton, useSkeletonVisibility } from "@/components/skeletons";
import { REPRESENTATIVE_COLUMNS } from "@/components/skeletons/table-columns";

export default function RepresentativesTab() {
  const representativesQuery = useQuery({
    queryKey: ["representatives"],
    queryFn: listRepresentatives,
    retry: false,
  });
  const { data } = representativesQuery;
  const error = representativesQuery.error ? errorMessage(representativesQuery.error) : null;
  const loading = representativesQuery.isLoading;
  const reload = () => representativesQuery.refetch();
  const showLoadingSkeleton = useSkeletonVisibility(loading && !data);
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const reps = data ?? [];
  const query = search.trim().toLowerCase();
  const filteredReps = query
    ? reps.filter((rep) => [rep.name, rep.phone_e164, rep.active ? "active" : "inactive", formatDate(rep.updated_at)]
        .some((value) => value.toLowerCase().includes(query)))
    : reps;
  const pagination = usePagination(filteredReps, 6);

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
          <Button className="btn-blue" onClick={() => router.push("/calling-agent/representatives/new")} disabled={loading}>
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

        {(loading && !data) || showLoadingSkeleton ? (
          <Table head={REPRESENTATIVE_COLUMNS.map((column) => column.label)} columns={REPRESENTATIVE_COLUMNS} loading skeleton={<TableSkeleton columns={REPRESENTATIVE_COLUMNS} />}>
          </Table>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : reps.length === 0 ? (
          <EmptyState
            icon={<PhoneForwarded size={20} />}
            title="No transfer agents yet"
            text="Add the people who should take a call when a lead is interested."
            action={<Button className="btn-blue" onClick={() => router.push("/calling-agent/representatives/new")}>Add transfer agent</Button>}
          />
        ) : reps.length > 0 ? (
          <>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                pagination.setPage(1);
              }}
              placeholder="Search transfer agents"
              className="agent-search w-full sm:max-w-sm"
            />
            <div className="recent-table blue-table">
            <Table head={REPRESENTATIVE_COLUMNS.map((column) => column.label)} columns={REPRESENTATIVE_COLUMNS} label="Transfer agents">
              {filteredReps.length === 0 ? (
                <TableMessage cols={REPRESENTATIVE_COLUMNS.length}>No transfer agents match your search.</TableMessage>
              ) : pagination.pageItems.map((rep) => (
                <tr key={rep.id}>
                  <td className="px-4 py-3 font-medium text-heading">{rep.name}</td>
                  <td className="tnum whitespace-nowrap px-4 py-3 text-body">{rep.phone_e164}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Toggle
                        label={`${rep.name} active`}
                        checked={rep.active}
                        disabled={busyId === rep.id}
                        className="[&[aria-checked=true]]:!bg-info"
                        onChange={(active) =>
                          run(rep.id, () => updateRepresentative(rep.id, { active }), [
                            active ? "Transfer activated" : "Transfer deactivated",
                            `"${rep.name}" ${active ? "will now" : "will no longer"} receive transferred calls.`,
                          ])
                        }
                      />
                      <Badge tone={rep.active ? "info" : "neutral"}>{rep.active ? "Active" : "Inactive"}</Badge>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(rep.updated_at)}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <IconButton label={`Edit ${rep.name}`} className="h-8 w-8 p-1 text-info hover:bg-info-bg hover:text-info [&>svg]:h-[18px] [&>svg]:w-[18px]" onClick={() => router.push(`/calling-agent/representatives/${rep.id}/edit`)}>
                        <Pencil size={18} />
                      </IconButton>
                      <DeleteIconButton
                        disabled={busyId === rep.id}
                        onClick={() => handleDelete(rep)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            </div>
            {filteredReps.length > 6 && (
              <div className="flex items-center justify-between gap-3 text-sm text-muted">
                <button
                  type="button"
                  onClick={() => pagination.setPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn-blue-filled inline-flex min-h-10 items-center gap-1 rounded-md px-4 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} aria-hidden /> Previous
                </button>
                <span aria-live="polite">Page {pagination.page} of {pagination.pageCount}</span>
                <button
                  type="button"
                  onClick={() => pagination.setPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pageCount}
                  className="btn-blue-filled inline-flex min-h-10 items-center gap-1 rounded-md px-4 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
