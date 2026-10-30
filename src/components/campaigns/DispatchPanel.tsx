"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import clsx from "clsx";

import { getDispatchStatus, patchDispatchControl } from "@/lib/api";
import type { DispatchStatus } from "@/types/types";
import { showSuccessNotification } from "@/hooks/useNotification";
import { confirmDialog } from "@/components/ConfirmDialog";
import { Button, Card, ErrorState, Skeleton, StatusBadge, formatDate } from "@/components/ui";

const KEY = ["dispatch-status"];

/**
 * The global switch that lets scheduled campaign calls go out, plus live queue counts
 */
export default function DispatchPanel() {
  const queryClient = useQueryClient();
  const status = useQuery<DispatchStatus>({
    queryKey: KEY,
    queryFn: getDispatchStatus,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const control = useMutation({
    mutationFn: patchDispatchControl,
    onSuccess: async (result) => {
      queryClient.setQueryData<DispatchStatus>(KEY, (current) =>
        current
          ? { ...current, enabled: result.enabled, live_calls_enabled: result.live_calls_enabled, updated_at: result.updated_at }
          : current,
      );
      await queryClient.invalidateQueries({ queryKey: KEY });
      showSuccessNotification(result.enabled ? "Scheduled calls will go out again." : "No new campaign calls will be placed.", {
        title: result.enabled ? "Dispatch on" : "Dispatch off",
      });
    },
  });

  const data = status.data;

  const toggle = async () => {
    if (!data) return;
    if (data.enabled) {
      const ok = await confirmDialog({
        title: "Turn dispatch off?",
        message: "No new calls will be placed for any campaign until you turn it back on. Calls already in progress finish normally.",
        confirmLabel: "Turn off",
        tone: "warning",
      });
      if (!ok) return;
    }
    control.mutate(!data.enabled);
  };

  if (status.isError) {
    return <ErrorState title="Couldn't load dispatch status" message={(status.error as Error).message} onRetry={() => status.refetch()} />;
  }

  const stats: Array<{ label: string; value: React.ReactNode; tone?: "good" | "bad" }> = data
    ? [
        { label: "Live calls", value: data.live_calls_enabled ? "Enabled" : "Disabled", tone: data.live_calls_enabled ? "good" : "bad" },
        { label: "Redis", value: data.redis_connected ? "Connected" : "Disconnected", tone: data.redis_connected ? "good" : "bad" },
        { label: "Active calls", value: data.active_calls },
        { label: "Queued calls", value: data.queued_calls },
        { label: "Ready to send", value: data.ready_outbox },
        { label: "Uncertain attempts", value: data.uncertain_attempts },
      ]
    : [];

  return (
    <Card
      title={
        <span className="flex items-center gap-3">
          Call dispatch
          {data && <StatusBadge status={data.enabled ? "active" : "paused"} label={data.enabled ? "On" : "Off"} />}
        </span>
      }
      description={data ? `Updated ${formatDate(data.updated_at)}` : "Whether scheduled campaign calls are being placed."}
      actions={
        <Button variant={data?.enabled ? "secondary" : "primary"} onClick={toggle} disabled={!data} loading={control.isPending}>
          {!control.isPending && (data?.enabled ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />)}
          {data?.enabled ? "Turn dispatch off" : "Turn dispatch on"}
        </Button>
      }
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
