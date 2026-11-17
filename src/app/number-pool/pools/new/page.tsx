"use client";

import dynamic from "next/dynamic";
import { PoolFormSkeleton } from "@/components/skeletons";

const PlivoPoolForm = dynamic(() => import("@/features/number-pool/components/PoolForms").then((module) => module.PlivoPoolForm), {
  loading: () => <PoolFormSkeleton />,
});

export default function NewPlivoPoolPage() {
  return <PlivoPoolForm pool={null} />;
}
