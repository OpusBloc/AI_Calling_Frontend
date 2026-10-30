"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteCampaign } from "@/lib/api";
import type { Campaign } from "@/types/types";
import { useAgents, useCampaigns } from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LinkRow,
  Pagination,
  SearchInput,
  Select,
  SkeletonRows,
  Table,
  TableMessage,
  StatusBadge,
  formatDate,
  humanize,
  usePagination,
} from "@/components/ui";
import { CAMPAIGN_STATUSES } from "./CampaignForm";

const HEAD = ["Campaign", "Status", "Agent", "Calling window", "Concurrency", "Start", "Updated", ""];

export const formatWindow = (start?: string | null, end?: string | null) =>
  start || end ? `${start?.slice(0, 5) ?? "—"} – ${end?.slice(0, 5) ?? "—"}` : "Any time";

export default function CampaignsTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const campaigns = useCampaigns();
  const agents = useAgents();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const agentName = useMemo(() => new Map((agents.data ?? []).map((a) => [a.id, a.name])), [agents.data]);
  const all = campaigns.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = all.filter(
    (c) => (status === "all" || c.status === status) && (!term || c.name.toLowerCase().includes(term)),
  );
  const pagination = usePagination(filtered);

  const remove = useMutation({
    mutationFn: (campaign: Campaign) => deleteCampaign(campaign.id),
    onSuccess: async (_r, campaign) => {
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      await queryClient.invalidateQueries({ queryKey: ["campaign-ids"] });
      showSuccessNotification(`"${campaign.name}" was deleted.`, { title: "Campaign deleted" });
    },
  });
  const handleDelete = async (campaign: Campaign) => {
    const ok = await confirmDialog({
      title: "Delete campaign?",
      message: `"${campaign.name}" and its scheduled calls will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete campaign",
    });
    if (ok) remove.mutate(campaign);
  };

  const newButton = (
    <Button onClick={() => router.push("/campaigns/new")}>
      <Plus size={16} aria-hidden /> New campaign
    </Button>
  );

  if (campaigns.isError) {
    return <ErrorState message={(campaigns.error as Error).message} onRetry={() => campaigns.refetch()} />;
  }

  if (campaigns.isSuccess && all.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone size={20} />}
        title="No campaigns yet"
        text="Upload a sheet of leads, choose an AI agent and Plivo pool, and the campaign calls them inside the hours you choose."
        action={newButton}
      />
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search campaigns" className="w-full sm:w-72" />
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full sm:w-44"
        >
          <option value="all">All statuses</option>
          {CAMPAIGN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </div>

      <Table head={HEAD} label="Campaigns">
        {campaigns.isLoading ? (
          <SkeletonRows cols={HEAD.length} />
        ) : filtered.length === 0 ? (
          <TableMessage cols={HEAD.length}>
            No campaigns match.{" "}
            <button
              type="button"
              className="font-medium text-accent-text underline underline-offset-2"
              onClick={() => {
                setSearch("");
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          </TableMessage>
        ) : (
          pagination.pageItems.map((c) => (
            <LinkRow key={c.id} href={`/campaigns/${encodeURIComponent(c.id)}`}>
              <td className="max-w-xs px-4 py-3">
                <span className="block truncate font-medium text-heading">{c.name}</span>
                <span className="tnum text-xs text-muted">
                  {c.plivo_pool_ids.length} Plivo pool{c.plivo_pool_ids.length === 1 ? "" : "s"}
                </span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-body">{agentName.get(c.agent_id) ?? <span className="text-faint">—</span>}</td>
              <td className="tnum whitespace-nowrap px-4 py-3 text-body">{formatWindow(c.window_start, c.window_end)}</td>
              <td className="tnum px-4 py-3 text-body">{c.concurrent_calls ?? c.concurrency_limit}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{c.status === "scheduled" ? formatDate(c.start_at) : "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(c.updated_at)}</td>
              <td className="px-4 py-2">
                <div className="flex justify-end gap-1">
                  <IconButton label={`Edit ${c.name}`} onClick={() => router.push(`/campaigns/${c.id}/edit`)}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton
                    label={`Delete ${c.name}`}
                    tone="danger"
                    disabled={remove.isPending && remove.variables?.id === c.id}
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </td>
            </LinkRow>
          ))
        )}
      </Table>
      <Pagination {...pagination} noun="campaigns" />
    </section>
  );
}
