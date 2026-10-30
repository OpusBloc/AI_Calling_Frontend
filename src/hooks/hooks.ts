
// hooks.ts: React Query wrappers around api.ts (loading/error state, caching, refetch).
/*
  React Query is used to:
  - fetch data (loading / error / success state handled for us)
  - cache the result so the same request isn't repeated
  - refetch automatically after a change (sync or update)
  Components call these hooks instead of calling api.ts directly.
 
*/


import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPlivoNumbers,
  syncPlivoNumbers,
  getPlivoPools,
  getPlivoPool,
  createPlivoPool,
  patchPlivoPool,
  deletePlivoPool,
  getAvailablePlivoNumbers,
  getCampaigns,
  getCampaignIds,
  getCampaign,
  getCampaignCalls,
  scheduleCampaign,
  postCampaignCallOutcome,
} from "@/lib/api";
import { listAgents, listRepresentatives } from "@/lib/callingAgentApi";
import type { CallOutcome, Campaign, CampaignScheduleResult, CallOutcomeResult, CreatePlivoPoolBody, PatchPlivoPoolBody, PlivoPool, ScheduledCampaignCall } from "@/types/types";

// Cache key for the numbers list; invalidating it refetches the table.
const KEY = ["plivo-numbers"];

const POOLS_KEY = ["plivo-pools"];
const CAMPAIGNS_KEY = ["campaigns"];
const CAMPAIGN_IDS_KEY = ["campaign-ids"];
const CAMPAIGN_CALLS_KEY = ["campaign-calls"];

export const useCampaigns = () =>
  useQuery<Campaign[]>({ queryKey: CAMPAIGNS_KEY, queryFn: getCampaigns, retry: false });

export const useCampaignIds = () =>
  useQuery<string[]>({ queryKey: CAMPAIGN_IDS_KEY, queryFn: getCampaignIds, retry: false });

export const useCampaign = (id: string, enabled = true) =>
  useQuery<Campaign>({ queryKey: [...CAMPAIGNS_KEY, id], queryFn: () => getCampaign(id), enabled: Boolean(id) && enabled, retry: false });

export const useCampaignCalls = (id: string, enabled = true) =>
  useQuery<ScheduledCampaignCall[]>({ queryKey: [...CAMPAIGN_CALLS_KEY, id], queryFn: () => getCampaignCalls(id), enabled: Boolean(id) && enabled, retry: false });

export const useScheduleCampaign = () => {
  const qc = useQueryClient();
  return useMutation<CampaignScheduleResult, Error, string>({
    mutationFn: scheduleCampaign,
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: [...CAMPAIGN_CALLS_KEY, result.campaign_id] });
      await qc.invalidateQueries({ queryKey: [...CAMPAIGNS_KEY, result.campaign_id] });
      await qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
};

export const usePostCampaignCallOutcome = () => {
  const qc = useQueryClient();
  return useMutation<CallOutcomeResult, Error, { campaignId: string; callId: string; outcome: CallOutcome }>({
    mutationFn: ({ campaignId, callId, outcome }) => postCampaignCallOutcome(campaignId, callId, outcome),
    onSuccess: async (_result, variables) => {
      await qc.invalidateQueries({ queryKey: [...CAMPAIGN_CALLS_KEY, variables.campaignId] });
    },
  });
};


// GET list of numbers -> { data, isLoading, isError }
export const usePlivoNumbers = () =>
  useQuery({
    queryKey: KEY,
    queryFn: getPlivoNumbers,
  });

  // POST /sync -> pull numbers from Plivo, then refetch the list
export const useSyncPlivoNumbers = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: syncPlivoNumbers,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }), // refetch table
  });
};

export const usePlivoPool = (id: string) =>
  useQuery<PlivoPool>({ queryKey: [...POOLS_KEY, id], queryFn: () => getPlivoPool(id), enabled: Boolean(id), retry: false });

// Shared with the campaign form, which uses the same keys
export const useAgents = () => useQuery({ queryKey: ["agents"], queryFn: listAgents, retry: false });
export const useRepresentatives = () =>
  useQuery({ queryKey: ["representatives"], queryFn: listRepresentatives, retry: false });

// GET list of pools
export const usePlivoPools = () =>
  useQuery({ queryKey: POOLS_KEY, queryFn: getPlivoPools, retry: false });

export const useCreatePlivoPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePlivoPoolBody) => createPlivoPool(body),
    onSuccess: (created) => {
      qc.setQueryData<PlivoPool[]>(POOLS_KEY, (pools) => pools ? [...pools, created] : pools);
      void qc.invalidateQueries({ queryKey: KEY, refetchType: "none" });
    },
  });
};

export const useUpdatePlivoPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchPlivoPoolBody }) => patchPlivoPool(id, body),
    onSuccess: (updated) => {
      qc.setQueryData<PlivoPool[]>(POOLS_KEY, (pools) =>
        pools?.map((pool) => pool.id === updated.id ? updated : pool),
      );
      qc.setQueryData([...POOLS_KEY, updated.id], updated);
      void qc.invalidateQueries({ queryKey: KEY, refetchType: "none" });
    },
  });
};

export const useDeletePlivoPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlivoPool(id),
    onSuccess: (_result, id) => {
      qc.setQueryData<PlivoPool[]>(POOLS_KEY, (pools) => pools?.filter((pool) => pool.id !== id));
      void qc.invalidateQueries({ queryKey: KEY, refetchType: "none" });
    },
  });
};

// Numbers that can be added to a given pool (only runs when poolId is set)
export const useAvailablePlivoNumbers = (poolId?: string) =>
  useQuery({
    queryKey: ["plivo-pools", poolId, "available"],
    queryFn: () => getAvailablePlivoNumbers(poolId!),
    enabled: !!poolId,
    retry: false,
  });

  
