"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

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
      <Toaster
        position="top-right"
        // Above the drawer (z-50) and its backdrop so errors raised from inside it stay visible
        containerStyle={{ top: 72, zIndex: 10100 }}
        toastOptions={{ duration: 3000, style: { background: "transparent", boxShadow: "none" } }}
      />
    </ClientOnly>
  );
}
