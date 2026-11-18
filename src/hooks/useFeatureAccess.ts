"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyFeatureAccess } from "@/lib/api";

export function useFeatureAccess() {
  return useQuery({
    queryKey: ["my-feature-access"],
    queryFn: getMyFeatureAccess,
    retry: false,
    // Feature access can change in the admin panel, so refresh it whenever
    // this screen mounts instead of relying on a potentially stale cached flag.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
