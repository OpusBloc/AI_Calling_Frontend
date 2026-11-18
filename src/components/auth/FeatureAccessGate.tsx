"use client";

import Image from "next/image";
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

  return (
    <section className="mx-auto flex min-h-[420px] w-full max-w-3xl flex-col items-center justify-center rounded-xl border border-hairline bg-surface px-6 py-10 text-center">
      <Image
        src="/Contact%20Admin%20Support%20Illustration.png"
        alt="Contact Opus Bloc Admin for access to this feature"
        width={420}
        height={300}
        className="mb-6 h-auto max-h-64 w-full max-w-sm object-contain"
        priority
      />
      <h1 className="text-xl font-semibold text-heading">Contact Opus Bloc Admin</h1>
    </section>
  );
}
