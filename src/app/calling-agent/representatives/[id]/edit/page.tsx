"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getRepresentative } from "@/lib/callingAgentApi";
import dynamic from "next/dynamic";
import { FormSkeleton, RouteSkeleton } from "@/components/skeletons";
import { EditLoadState } from "@/components/ui";

const RepresentativeForm = dynamic(() => import("@/features/calling-agent/components/RepresentativeForm"), {
  loading: () => <RouteSkeleton><div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-semibold text-heading">Edit transfer agent</h1><FormSkeleton sections={2} /></div></RouteSkeleton>,
});

export default function EditRepresentativePage() {
  const { id } = useParams<{ id: string }>();
  const rep = useQuery({ queryKey: ["representatives", id], queryFn: () => getRepresentative(id), retry: false });
  if (!rep.data) {
    return (
      <EditLoadState
        query={rep}
        noun="transfer agent"
      />
    );
  }
  return <RepresentativeForm key={rep.data.id} rep={rep.data} />;
}
