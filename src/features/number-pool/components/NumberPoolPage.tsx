"use client";

import dynamic from "next/dynamic";
import { NumberPoolSkeleton } from "@/components/skeletons";

const PoolsTab = dynamic(() => import("@/features/number-pool/components/pools-tab").then((module) => module.PoolsTab), {
  loading: () => <NumberPoolSkeleton />,
});

export default function NumberPoolPage() {
  return (
    <div className="space-y-6">
      <PoolsTab />
    </div>
  );
}
