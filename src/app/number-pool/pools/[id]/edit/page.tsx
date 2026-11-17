"use client";

import { useParams } from "next/navigation";

import { usePlivoPool } from "@/hooks/hooks";
import { PlivoPoolForm } from "@/features/number-pool/components/PoolForms";
import { EditLoadState } from "@/components/ui";

export default function EditPlivoPoolPage() {
  const { id } = useParams<{ id: string }>();
  const pool = usePlivoPool(id);
  if (!pool.data) {
    return (
      <EditLoadState
        query={pool}
        noun="pool"
      />
    );
  }
  return <PlivoPoolForm key={pool.data.id} pool={pool.data} />;
}
