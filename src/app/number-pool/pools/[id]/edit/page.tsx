"use client";

import { useParams } from "next/navigation";

import { usePlivoPool } from "@/hooks/hooks";
import { PlivoPoolForm } from "@/components/number-pool/PoolForms";
import { EditLoadState } from "@/components/ui";

export default function EditPlivoPoolPage() {
  const { id } = useParams<{ id: string }>();
  const pool = usePlivoPool(id);
  if (!pool.data) {
    return (
      <EditLoadState
        query={pool}
        noun="pool"
        breadcrumbs={[{ label: "Number Pool", href: "/number-pool" }, { label: "Edit" }]}
        backHref="/number-pool"
      />
    );
  }
  return <PlivoPoolForm key={pool.data.id} pool={pool.data} />;
}
