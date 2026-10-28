"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AuthGuard from "@/components/auth/AuthGuard";
import { ClientOnly } from "@/components/ClientOnly";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ClientOnly>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>{children}</AuthGuard>
      </QueryClientProvider>
    </ClientOnly>
  );
}
