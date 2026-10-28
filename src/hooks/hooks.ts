
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
} from "@/lib/api";
import { CreatePlivoPoolBody, PatchPlivoPoolBody, PlivoPool } from "./types";

// Cache key for the numbers list; invalidating it refetches the table.
const KEY = ["plivo-numbers"];

const POOLS_KEY = ["plivo-pools"];


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

  
