"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getRepresentative } from "@/lib/callingAgentApi";
import RepresentativeForm from "@/components/calling-agent/RepresentativeForm";
import { EditLoadState } from "@/components/ui";

export default function EditRepresentativePage() {
  const { id } = useParams<{ id: string }>();
  const rep = useQuery({ queryKey: ["representatives", id], queryFn: () => getRepresentative(id), retry: false });
  if (!rep.data) {
    return (
      <EditLoadState
        query={rep}
        noun="representative"
        breadcrumbs={[
          { label: "Calling Agent", href: "/calling-agent" },
          { label: "Representatives", href: "/calling-agent?tab=representatives" },
          { label: "Edit" },
        ]}
        backHref="/calling-agent?tab=representatives"
      />
    );
  }
  return <RepresentativeForm key={rep.data.id} rep={rep.data} />;
}
