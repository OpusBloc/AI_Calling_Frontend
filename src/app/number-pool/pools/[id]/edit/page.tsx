"use client";

import { useParams } from "next/navigation";

import { usePlivoPool } from "@/hooks/hooks";
import dynamic from "next/dynamic";
import { PoolFormSkeleton } from "@/components/skeletons";
import { EditLoadState } from "@/components/ui";

const PlivoPoolForm = dynamic(() => import("@/features/number-pool/components/PoolForms").then((module) => module.PlivoPoolForm), {
  loading: () => <PoolFormSkeleton title="Edit Plivo pool" />,
});

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
