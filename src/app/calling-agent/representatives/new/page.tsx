"use client";

import dynamic from "next/dynamic";
import { FormSkeleton, RouteSkeleton } from "@/components/skeletons";

const RepresentativeForm = dynamic(() => import("@/features/calling-agent/components/RepresentativeForm"), {
  loading: () => <RouteSkeleton><div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-semibold text-heading">Add transfer agent</h1><FormSkeleton sections={2} /></div></RouteSkeleton>,
});

export default function NewRepresentativePage() {
  return <RepresentativeForm rep={null} />;
}
