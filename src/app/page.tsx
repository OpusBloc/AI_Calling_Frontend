import HeroSection, { type HeroSectionId } from "@/components/layout/HeroSection";

const sectionIds = new Set<HeroSectionId>([
  "dashboard",
  "campaigns",
  "number-pool",
  "calling-agent",
  "templates",
]);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: requestedTab } = await searchParams;
  const section = sectionIds.has(requestedTab as HeroSectionId)
    ? (requestedTab as HeroSectionId)
    : "dashboard";

  return <HeroSection section={section} />;
}
