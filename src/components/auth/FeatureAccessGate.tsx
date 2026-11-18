"use client";

import type { ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

export default function FeatureAccessGate({
  feature,
  children,
}: {
  feature: string;
  children: ReactNode;
}) {
  const { data } = useFeatureAccess();
  const access = data?.features?.[feature];

  // Fail open while access data is unavailable; only replace the page when the
  // API explicitly reports that this feature is disabled.
  if (access?.enabled !== false) return children;

  const disabledCopy: Record<string, { heading: string; paragraph: string }> = {
    call_transfer: {
      heading: "Call Transfer isn't enabled yet",
      paragraph: "Please contact Opus Bloc Admin to enable Call Transfer. Once it's on, you can hand live calls over to your team.",
    },
    whatsapp: {
      heading: "Templates aren't enabled yet",
      paragraph: "Please contact Opus Bloc Admin to enable WhatsApp. Once it's on, you can create and manage message templates.",
    },
    plivo: {
      heading: "Number Pool isn't enabled yet",
      paragraph: "Please contact Opus Bloc Admin to enable Plivo. Once it's on, you can manage your phone number pools.",
    },
    campaigns: {
      heading: "Campaigns aren't enabled yet",
      paragraph: "Please contact Opus Bloc Admin to enable Campaigns.",
    },
  };
  const copy = disabledCopy[feature] ?? {
    heading: "This feature isn't enabled yet",
    paragraph: "Please contact Opus Bloc Admin to enable this feature.",
  };

  return (
    <section aria-label={copy.heading} className="flex min-h-[520px] w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-heading">{copy.heading}</h2>
        <p className="max-w-xl text-sm text-muted">{copy.paragraph}</p>
      </div>
      <div
        aria-hidden="true"
        className="h-[440px] w-full bg-[url('/Admin%20Enable%20Background%20image.png')] bg-[length:740px_auto] bg-center bg-no-repeat"
      />
    </section>
  );
}
