"use client";

import PageHeader from "@/components/PageHeader";
import { PoolsTab } from "@/components/number-pool/pools-tab";

export default function NumberPoolPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Number Pool" description="The Plivo numbers your campaigns call from, grouped into Plivo pools." />
      <PoolsTab />
    </div>
  );
}
