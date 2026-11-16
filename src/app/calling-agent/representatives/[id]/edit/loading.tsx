import { FormSkeleton, RouteSkeleton } from "@/components/skeletons";

export default function Loading() {
  return <RouteSkeleton><div className="mx-auto max-w-3xl space-y-5"><h1 className="text-2xl font-semibold text-heading">Edit transfer agent</h1><FormSkeleton sections={2} /></div></RouteSkeleton>;
}
