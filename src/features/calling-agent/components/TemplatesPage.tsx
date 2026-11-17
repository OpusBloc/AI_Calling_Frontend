"use client";

import dynamic from "next/dynamic";
import { TemplatesSkeleton } from "@/components/skeletons";

const WhatsAppMessagesTab = dynamic(() => import("@/features/calling-agent/components/WhatsAppMessagesTab"), {
  loading: () => <TemplatesSkeleton />,
});

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <WhatsAppMessagesTab />
    </div>
  );
}
