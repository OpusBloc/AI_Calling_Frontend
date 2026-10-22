"use client";

import { ReactNode } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import { ClientOnly } from "@/components/ClientOnly";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClientOnly>
      <AuthGuard>{children}</AuthGuard>
    </ClientOnly>
  );
}
