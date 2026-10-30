"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

import { getCampaignDispatch, setCampaignDispatch } from "@/lib/api";
import type { DispatchStatus } from "@/types/types";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import { Card, ErrorState, Skeleton, StatusBadge, formatDate } from "@/components/ui";

export const dispatchKey = (campaignId: string) => ["dispatch-status", campaignId];

/** Live dispatch state for one campaign; polls while calls may be going out */
export function useCampaignDispatch(campaignId: string) {
  return useQuery<DispatchStatus>({
    queryKey: dispatchKey(campaignId),
    queryFn: () => getCampaignDispatch(campaignId),
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => (q.state.data?.enabled ? 10_000 : false),
  });
}

/**
 * Pause/resume a campaign's calls. Pausing asks first, since it stops new calls.
 */
export function useToggleDispatch(campaignId: string, campaignName: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => setCampaignDispatch(campaignId, enabled),
    onSuccess: async (result) => {
      queryClient.setQueryData<DispatchStatus>(dispatchKey(campaignId), (current) =>
        current ? { ...current, enabled: result.enabled, status: result.status, updated_at: result.updated_at } : current,
      );
      // The campaign's own status changes too (paused ↔ scheduled)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dispatchKey(campaignId) }),
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["campaign-report", campaignId] }),
      ]);
      showSuccessNotification(result.enabled ? `"${campaignName}" will place calls again.` : `"${campaignName}" won't place new calls.`, {
        title: result.enabled ? "Calls resumed" : "Calls paused",
      });
    },
  });

  const toggle = async (enable: boolean) => {
    if (!enable) {
      const ok = await confirmDialog({
        title: "Pause this campaign?",
        message: "No new calls will be placed until you resume it. Calls already in progress finish normally.",
        confirmLabel: "Pause calls",
        tone: "warning",
      });
      if (!ok) return;
    }
    mutation.mutate(enable);
  };

  return { toggle, pending: mutation.isPending };
}

/**
 * Queue depth and health for one campaign's dispatch
 */
export default function DispatchPanel({ campaignId }: { campaignId: string }) {
  const status = useCampaignDispatch(campaignId);
  const data = status.data;

  if (status.isError) {
    return <ErrorState title="Couldn't load dispatch status" message={(status.error as Error).message} onRetry={() => status.refetch()} />;
  }

  const stats: Array<{ label: string; value: React.ReactNode; tone?: "good" | "bad" }> = data
    ? [
        { label: "Active calls", value: data.active_calls },
        { label: "Queued calls", value: data.queued_calls },
        { label: "Ready to send", value: data.ready_outbox },
        { label: "Uncertain attempts", value: data.uncertain_attempts, tone: data.uncertain_attempts > 0 ? "bad" : undefined },
        { label: "Live calling", value: data.live_calls_enabled ? "Enabled" : "Disabled", tone: data.live_calls_enabled ? "good" : "bad" },
        { label: "Queue (Redis)", value: data.redis_connected ? "Connected" : "Disconnected", tone: data.redis_connected ? "good" : "bad" },
      ]
    : [];

  return (
    <Card
      title={
        <span className="flex items-center gap-3">
          Dispatch
          {data && <StatusBadge status={data.enabled ? "active" : "paused"} label={data.enabled ? "Placing calls" : "Not placing calls"} />}
        </span>
      }
      description={data ? `Refreshes every 10 seconds while on · updated ${formatDate(data.updated_at)}` : "Whether this campaign is placing calls."}
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {status.isLoading
          ? Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-md" />)
          : stats.map((s) => (
              <div key={s.label} className="rounded-md bg-raised px-3 py-2.5">
                <dt className="text-xs text-muted">{s.label}</dt>
                <dd
                  className={clsx(
                    "tnum mt-1 text-sm font-semibold",
                    s.tone === "good" ? "text-gain" : s.tone === "bad" ? "text-loss" : "text-heading",
                  )}
                >
                  {s.value}
                </dd>
              </div>
            ))}
      </dl>
    </Card>
  );
}
