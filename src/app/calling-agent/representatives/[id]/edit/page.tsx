"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getRepresentative } from "@/lib/callingAgentApi";
import RepresentativeForm from "@/features/calling-agent/components/RepresentativeForm";
import { EditLoadState } from "@/components/ui";

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
