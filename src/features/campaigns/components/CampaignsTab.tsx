"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Megaphone, Pencil, Plus } from "lucide-react";

import { deleteCampaign } from "@/lib/api";
import type { Campaign, Weekday } from "@/types/types";
import { useAgents, useCampaigns } from "@/hooks/hooks";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import { DeleteIconButton } from "@/components/ui/ActionIconButtons";
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LinkRow,
  Pagination,
  SearchInput,
  Table,
  TableMessage,
  StatusBadge,
  formatDate,
  humanize,
  usePagination,
} from "@/components/ui";
import { CAMPAIGN_STATUSES } from "./CampaignForm";
import { CampaignsTableSkeleton } from "@/components/skeletons";
import { useSkeletonVisibility } from "@/components/skeletons";
import { CAMPAIGN_COLUMNS } from "@/components/skeletons/table-columns";
import SelectMenu from "@/components/SelectMenu";

const HEAD = CAMPAIGN_COLUMNS.map((column) => column.label);

export const formatWindow = (start?: string | null, end?: string | null) =>
  start || end ? `${start?.slice(0, 5) ?? "-"} – ${end?.slice(0, 5) ?? "-"}` : "Any time";

export const WEEKDAYS: { id: Weekday; short: string }[] = [
  { id: "monday", short: "Mon" },
  { id: "tuesday", short: "Tue" },
  { id: "wednesday", short: "Wed" },
  { id: "thursday", short: "Thu" },
  { id: "friday", short: "Fri" },
  { id: "saturday", short: "Sat" },
  { id: "sunday", short: "Sun" },
];

/** ["monday", …, "friday"] → "Mon–Fri"; empty or all seven → "Every day" */
export const formatDays = (days?: Weekday[] | null) => {
  const set = new Set(days ?? []);
  const on = WEEKDAYS.filter((d) => set.has(d.id));
  if (on.length === 0 || on.length === 7) return "Every day";
  const key = on.map((d) => d.short).join(",");
  if (key === "Mon,Tue,Wed,Thu,Fri") return "Mon–Fri";
  if (key === "Sat,Sun") return "Weekends";
  return on.map((d) => d.short).join(", ");
};

export default function CampaignsTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const campaigns = useCampaigns();
  const agents = useAgents();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const showCampaignSkeleton = useSkeletonVisibility(campaigns.isLoading);

  const agentName = useMemo(() => new Map((agents.data ?? []).map((a) => [a.id, a.name])), [agents.data]);
  const all = campaigns.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = all.filter(
    (c) => (status === "all" || c.status === status) && (!term || c.name.toLowerCase().includes(term)),
  );
  const pagination = usePagination(filtered, 6);

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
    <Button className="btn-blue-filled w-full sm:w-auto" onClick={() => router.push("/campaigns/new")}>
      <Plus size={16} aria-hidden /> New campaign
    </Button>
  );

  if (campaigns.isError) {
    return <ErrorState message={(campaigns.error as Error).message} onRetry={() => campaigns.refetch()} />;
  }

  if (campaigns.isSuccess && all.length === 0 && !showCampaignSkeleton) {
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
    <section className="blue-fields space-y-3">
      <button
        type="button"
        aria-label="Back to dashboard"
        title="Back to dashboard"
        onClick={() => router.push("/")}
        className="btn-blue-filled inline-flex size-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search campaigns" className="w-full sm:w-72" />
        <SelectMenu
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            ...CAMPAIGN_STATUSES.map((s) => ({ value: s, label: humanize(s) })),
          ]}
          className="w-full sm:w-44"
        />
        <div className="w-full sm:ml-auto sm:w-auto">{newButton}</div>
      </div>

      <Table head={HEAD} columns={CAMPAIGN_COLUMNS} label="Campaigns" className="blue-table" loading={campaigns.isLoading || showCampaignSkeleton} skeleton={<CampaignsTableSkeleton />}>
        {filtered.length === 0 ? (
          <TableMessage cols={HEAD.length}>
            No campaigns match.{" "}
            <button
              type="button"
              className="font-medium text-link underline underline-offset-2"
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

              </td>
              <td className="px-4 py-3">
                <StatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-body">{agentName.get(c.agent_id) ?? <span className="text-faint">-</span>}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="tnum block text-body">{formatWindow(c.window_start, c.window_end)}</span>
                <span className="text-xs text-muted">{formatDays(c.call_days)}</span>
              </td>
              <td className="tnum px-4 py-3 text-body">{c.concurrent_calls ?? c.concurrency_limit}</td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{c.start_at ? formatDate(c.start_at) : "-"}</td>
              <td className="px-4 py-2">
                <div className="flex items-center justify-end gap-2">
                  <IconButton label={`Edit ${c.name}`} className="h-8 w-8 p-1 [&>svg]:h-[18px] [&>svg]:w-[18px]" onClick={() => router.push(`/campaigns/${c.id}/edit`)}>
                    <Pencil size={18} />
                  </IconButton>
                  <DeleteIconButton
                    disabled={remove.isPending && remove.variables?.id === c.id}
                    onClick={() => handleDelete(c)}
                  />
                </div>
              </td>
            </LinkRow>
          ))
        )}
      </Table>
      <Pagination {...pagination} noun="campaigns" mobileCompact />
    </section>
  );
}
