// hooks.ts: React Query wrappers around api.ts (loading/error state, caching, refetch).
/*
  React Query is used to:
  - fetch data (loading / error / success state handled for us)
  - cache the result so the same request isn't repeated
  - refetch automatically after a change (sync or update)
  Components call these hooks instead of calling api.ts directly.
*/

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getUserIdFromToken } from "@/lib/auth";
import {
  getPlivoNumbers,
  getPlivoNumberCallStats,
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
  getCampaignCallbacks,
  getCampaignReport,
  getCampaignCallDetail,
  scheduleCampaign,
  postCampaignCallOutcome,
} from "@/lib/api";
import {
  listAgents,
  listRepresentatives,
  listWhatsAppMessages,
  getClassifications,
  getClassification,
  getClassificationCalls,
  getUnclassifiedCalls,
  createClassification,
  updateClassification,
  deleteClassification,
  getCampaignClassifications,
  getCampaignClassificationCalls,
  getCampaignUnclassifiedCalls,
  createWhatsAppMessage,
  updateWhatsAppMessage,
   deleteWhatsAppMessage,
   type WhatsAppMessageInput,
  type ClassificationInput,
  type ClassificationSummary,
  type Classification,
  type ClassificationCallsResponse,
  type ClassificationCallsParams,
} from "@/lib/callingAgentApi";
import type { CallOutcome, Campaign, CampaignCallDetail, CampaignReport, CampaignScheduleResult, CallOutcomeResult, CreatePlivoPoolBody, PatchPlivoPoolBody, PlivoPool,
     CampaignCallsResponse,
  CampaignCallbacksResponse,
   } from "@/types/types";

// Cache key for the numbers list; invalidating it refetches the table.
const KEY = ["plivo-numbers"];

const poolsKey = () => ["plivo-pools", getUserIdFromToken()];
const CAMPAIGNS_KEY = ["campaigns"];
const CAMPAIGN_IDS_KEY = ["campaign-ids"];
const CAMPAIGN_CALLS_KEY = ["campaign-calls"];
const classificationsKey = (agentId: string, campaignId?: string) =>
  campaignId ? ["classifications", agentId, campaignId] : ["classifications", agentId];

export const useCampaigns = () =>
  useQuery<Campaign[]>({ queryKey: CAMPAIGNS_KEY, queryFn: getCampaigns, retry: false });

export const useCampaignIds = () =>
  useQuery<string[]>({ queryKey: CAMPAIGN_IDS_KEY, queryFn: getCampaignIds, retry: false });

export const useCampaign = (id: string, enabled = true) =>
  useQuery<Campaign>({ queryKey: [...CAMPAIGNS_KEY, id], queryFn: () => getCampaign(id), enabled: Boolean(id) && enabled, retry: false });

export const useCampaignReport = (id: string, enabled = true) =>
  useQuery<CampaignReport>({ queryKey: ["campaign-report", id], queryFn: () => getCampaignReport(id), enabled: Boolean(id) && enabled, retry: false });

export const useCampaignCallDetail = (campaignId: string, callId: string | null) =>
  useQuery<CampaignCallDetail>({
    queryKey: ["campaign-call-detail", campaignId, callId],
    queryFn: () => {
      if (!callId) throw new Error("A call must be selected to load its details.");
      return getCampaignCallDetail(campaignId, callId);
    },
    enabled: Boolean(campaignId && callId),
    retry: false,
  });

export const useCampaignCalls = (id: string, enabled = true) =>
  useQuery<CampaignCallsResponse>({
    queryKey: [...CAMPAIGN_CALLS_KEY, id],
    queryFn: () => getCampaignCalls(id),
    enabled: Boolean(id) && enabled,
    retry: false,
  });

export const useCampaignCallbacks = (id: string, enabled = true) =>
  useQuery<CampaignCallbacksResponse>({
    queryKey: ["campaign-callbacks", id],
    queryFn: () => getCampaignCallbacks(id),
    enabled: Boolean(id) && enabled,
    retry: false,
  });
  
export const useScheduleCampaign = () => {
  const qc = useQueryClient();
  return useMutation<CampaignScheduleResult, Error, string>({
    mutationFn: scheduleCampaign,
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: [...CAMPAIGN_CALLS_KEY, result.campaign_id] });
      await qc.invalidateQueries({ queryKey: ["campaign-report", result.campaign_id] });
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
      await qc.invalidateQueries({ queryKey: ["campaign-report", variables.campaignId] });
      await qc.invalidateQueries({
        queryKey: ["campaign-call-detail", variables.campaignId, variables.callId],
      });
    },
  });
};

// GET list of numbers -> { data, isLoading, isError }
export const usePlivoNumbers = () =>
  useQuery({
    queryKey: KEY,
    queryFn: getPlivoNumbers,
  });

export const usePlivoNumberCallStats = () =>
  useQuery({
    queryKey: ["plivo-number-call-stats"],
    queryFn: getPlivoNumberCallStats,
    retry: false,
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
  useQuery<PlivoPool>({ queryKey: [...poolsKey(), id], queryFn: () => getPlivoPool(id), enabled: Boolean(id), retry: false });

// Shared with the campaign form, which uses the same keys
export const useAgents = () => useQuery({ queryKey: ["agents"], queryFn: listAgents, retry: false });
export const useRepresentatives = () =>
  useQuery({ queryKey: ["representatives"], queryFn: listRepresentatives, retry: false });
export const useWhatsAppMessages = () =>
  useQuery({ queryKey: ["whatsapp-messages"], queryFn: listWhatsAppMessages, retry: false });

// GET list of pools
export const usePlivoPools = () =>
  useQuery({ queryKey: poolsKey(), queryFn: getPlivoPools, retry: false });

export const useCreatePlivoPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePlivoPoolBody) => createPlivoPool(body),
    onSuccess: (created) => {
      qc.setQueryData<PlivoPool[]>(poolsKey(), (pools) => pools ? [...pools, created] : pools);
      void qc.invalidateQueries({ queryKey: KEY, refetchType: "none" });
    },
  });
};

export const useUpdatePlivoPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PatchPlivoPoolBody }) => patchPlivoPool(id, body),
    onSuccess: (updated) => {
      qc.setQueryData<PlivoPool[]>(poolsKey(), (pools) =>
        pools?.map((pool) => pool.id === updated.id ? updated : pool),
      );
      qc.setQueryData([...poolsKey(), updated.id], updated);
      void qc.invalidateQueries({ queryKey: KEY, refetchType: "none" });
    },
  });
};

export const useDeletePlivoPool = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePlivoPool(id),
    onSuccess: (_result, id) => {
      qc.setQueryData<PlivoPool[]>(poolsKey(), (pools) => pools?.filter((pool) => pool.id !== id));
      void qc.invalidateQueries({ queryKey: KEY, refetchType: "none" });
    },
  });
};

// Numbers that can be added to a given pool (only runs when poolId is set)
export const useAvailablePlivoNumbers = (poolId?: string) =>
  useQuery({
    queryKey: [...poolsKey(), poolId, "available"],
    queryFn: () => getAvailablePlivoNumbers(poolId!),
    enabled: !!poolId,
    retry: false,
  });

/* ----------------------------- Classifications ---------------------------- */

export const useClassifications = (agentId: string, campaignId?: string) =>
  useQuery<ClassificationSummary>({
    queryKey: classificationsKey(agentId, campaignId),
    queryFn: () => getClassifications(agentId, campaignId),
    enabled: Boolean(agentId),
    retry: false,
  });


export const useClassification = (agentId: string, classificationId: string) =>
  useQuery<Classification>({
    queryKey: ["classification", agentId, classificationId],
    queryFn: () => getClassification(agentId, classificationId),
    enabled: Boolean(agentId && classificationId),
    retry: false,
  });

export const useClassificationCalls = (
  agentId: string,
  classificationId: string,
  params?: ClassificationCallsParams,
) =>
  useQuery<ClassificationCallsResponse>({
    queryKey: ["classification-calls", agentId, classificationId, params],
    queryFn: () => getClassificationCalls(agentId, classificationId, params),
    enabled: Boolean(agentId && classificationId),
    retry: false,
  });

export const useUnclassifiedCalls = (
  agentId: string,
  params?: ClassificationCallsParams,
) =>
  useQuery<ClassificationCallsResponse>({
    queryKey: ["unclassified-calls", agentId, params],
    queryFn: () => getUnclassifiedCalls(agentId, params),
    enabled: Boolean(agentId),
    retry: false,
  });

function useRefreshClassifications() {
  const qc = useQueryClient();
  return async (agentId: string) => {
    await qc.invalidateQueries({ queryKey: ["classifications", agentId] });
    await qc.invalidateQueries({ queryKey: ["agents"] });
  };
}

export const useCreateClassification = () => {
  const refresh = useRefreshClassifications();
  return useMutation({
    mutationFn: ({ agentId, body }: { agentId: string; body: ClassificationInput }) =>
      createClassification(agentId, body),
    onSuccess: (_r, v) => refresh(v.agentId),
  });
};

export const useUpdateClassification = () => {
  const refresh = useRefreshClassifications();
  return useMutation({
    mutationFn: ({ agentId, id, body }: { agentId: string; id: string; body: Partial<ClassificationInput> }) =>
      updateClassification(agentId, id, body),
    onSuccess: (_r, v) => refresh(v.agentId),
  });
};

export const useDeleteClassification = () => {
  const refresh = useRefreshClassifications();
  return useMutation({
    mutationFn: ({ agentId, id }: { agentId: string; id: string }) => deleteClassification(agentId, id),
    onSuccess: (_r, v) => refresh(v.agentId),
  });
};

export const useCampaignClassifications = (campaignId: string) =>
  useQuery<ClassificationSummary>({
    queryKey: ["campaign-classifications", campaignId],
    queryFn: () => getCampaignClassifications(campaignId),
    enabled: Boolean(campaignId),
    retry: false,
  });

export const useCampaignClassificationCalls = (
  campaignId: string,
  classificationId: string,
  params?: { page?: number; page_size?: number },
) => {
  const queryClient = useQueryClient();
  const page = params?.page ?? 1;
  const pageSize = params?.page_size ?? 10;
  const query = useQuery<ClassificationCallsResponse>({
    queryKey: ["campaign-classification-calls", campaignId, classificationId, params],
    queryFn: () => getCampaignClassificationCalls(campaignId, classificationId, params),
    enabled: Boolean(campaignId && classificationId),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!query.data || query.isPlaceholderData || query.data.total <= page * pageSize || !campaignId || !classificationId) return;
    const nextParams = { page: page + 1, page_size: pageSize };
    void queryClient.prefetchQuery({
      queryKey: ["campaign-classification-calls", campaignId, classificationId, nextParams],
      queryFn: () => getCampaignClassificationCalls(campaignId, classificationId, nextParams),
      staleTime: 60_000,
    });
  }, [campaignId, classificationId, page, pageSize, query.data, query.isPlaceholderData, queryClient]);

  return query;
};

export const useCampaignUnclassifiedCalls = (
  campaignId: string,
  params?: { page?: number; page_size?: number },
) => {
  const queryClient = useQueryClient();
  const page = params?.page ?? 1;
  const pageSize = params?.page_size ?? 10;
  const query = useQuery<ClassificationCallsResponse>({
    queryKey: ["campaign-unclassified-calls", campaignId, params],
    queryFn: () => getCampaignUnclassifiedCalls(campaignId, params),
    enabled: Boolean(campaignId),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!query.data || query.isPlaceholderData || query.data.total <= page * pageSize || !campaignId) return;
    const nextParams = { page: page + 1, page_size: pageSize };
    void queryClient.prefetchQuery({
      queryKey: ["campaign-unclassified-calls", campaignId, nextParams],
      queryFn: () => getCampaignUnclassifiedCalls(campaignId, nextParams),
      staleTime: 60_000,
    });
  }, [campaignId, page, pageSize, query.data, query.isPlaceholderData, queryClient]);

  return query;
};


  function useRefreshWhatsAppMessages() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: ["whatsapp-messages"] });
    await qc.invalidateQueries({ queryKey: ["agents"] }); // agents embed their messages
  };
}

export const useCreateWhatsAppMessage = () => {
  const refresh = useRefreshWhatsAppMessages();
  return useMutation({
    mutationFn: (body: WhatsAppMessageInput) => createWhatsAppMessage(body),
    onSuccess: refresh,
  });
};

export const useUpdateWhatsAppMessage = () => {
  const refresh = useRefreshWhatsAppMessages();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<WhatsAppMessageInput> }) =>
      updateWhatsAppMessage(id, body),
    onSuccess: refresh,
  });
};

export const useDeleteWhatsAppMessage = () => {
  const refresh = useRefreshWhatsAppMessages();
  return useMutation({
    mutationFn: (id: string) => deleteWhatsAppMessage(id),
    onSuccess: refresh,
  });
};
