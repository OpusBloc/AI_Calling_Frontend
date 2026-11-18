"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyFeatureAccess } from "@/lib/api";

export function useFeatureAccess() {
  return useQuery({
    queryKey: ["my-feature-access"],
    queryFn: getMyFeatureAccess,
    retry: false,
    staleTime: 60_000,
  });
}
