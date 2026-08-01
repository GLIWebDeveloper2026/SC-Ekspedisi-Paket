"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Default staleTime 0 bikin SETIAP pindah halaman refetch ulang
            // ke server walau baru saja dibuka — inilah kenapa pindah menu
            // terasa lambat (nunggu network lagi tiap kali, bukan cache).
            // 30 detik cukup untuk data operasional ini (bukan real-time).
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
}
