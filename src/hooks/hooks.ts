
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
  getLeadPools,
  getLeadPool,
  getLeads,
  deleteLeads,
  createLeadPool,
  updateLeadPool,
  deleteLeadPool,
  importLeadSheet,
} from "@/lib/api";
import type { CallOutcome, Campaign, CampaignScheduleResult, CallOutcomeResult, CreatePlivoPoolBody, Lead, LeadPool, LeadPoolCreate, LeadPoolUpdate, PatchPlivoPoolBody, PlivoPool, ScheduledCampaignCall } from "@/types/types";

// Cache key for the numbers list; invalidating it refetches the table.
const KEY = ["plivo-numbers"];

const POOLS_KEY = ["plivo-pools"];
const CAMPAIGNS_KEY = ["campaigns"];
const CAMPAIGN_IDS_KEY = ["campaign-ids"];
const CAMPAIGN_CALLS_KEY = ["campaign-calls"];
const LEAD_POOLS_KEY = ["lead-pools"];
const LEADS_KEY = ["leads"];

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

export const useLeadPools = () =>
  useQuery<LeadPool[]>({ queryKey: LEAD_POOLS_KEY, queryFn: getLeadPools, retry: false });

export const useLeads = () =>
  useQuery<Lead[]>({ queryKey: LEADS_KEY, queryFn: getLeads, retry: false });

export const useDeleteLeads = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLeads,
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
};

export const useLeadPool = (id: string) =>
  useQuery<LeadPool>({ queryKey: [...LEAD_POOLS_KEY, id], queryFn: () => getLeadPool(id), enabled: Boolean(id), retry: false });

export const useCreateLeadPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LeadPoolCreate) => createLeadPool(body),
    onSuccess: (created) => qc.setQueryData<LeadPool[]>(LEAD_POOLS_KEY, (pools) => pools ? [...pools, created] : [created]),
  });
};

export const useUpdateLeadPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: LeadPoolUpdate }) => updateLeadPool(id, body),
    onSuccess: (updated) => qc.setQueryData<LeadPool[]>(LEAD_POOLS_KEY, (pools) => pools?.map((pool) => pool.id === updated.id ? updated : pool)),
  });
};

export const useDeleteLeadPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLeadPool,
    onSuccess: (_result, id) => qc.setQueryData<LeadPool[]>(LEAD_POOLS_KEY, (pools) => pools?.filter((pool) => pool.id !== id)),
  });
};

export const useImportLeadSheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importLeadSheet,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: LEAD_POOLS_KEY });
      await qc.invalidateQueries({ queryKey: LEADS_KEY });
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

  
