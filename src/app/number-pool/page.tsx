"use client";

import { PoolsTab } from "../../components/number-pool/pools-tab";
import PageHeader from "@/components/PageHeader";

export default function NumberPoolPage() {
  return (
    <div className="space-y-6 px-6 py-4">
      <PageHeader title="Number Pool" description="Caller IDs and number pools used to place calls." />
      <PoolsTab />
    </div>
  );
}
