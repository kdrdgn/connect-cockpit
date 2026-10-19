"use client";

import { ClientProvider, createClient } from "@cockpit/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const [client] = useState(() => createClient({ fetch: (input, init) => fetch(input, init) }));
  return (
    <QueryClientProvider client={queryClient}>
      <ClientProvider client={client}>{children}</ClientProvider>
    </QueryClientProvider>
  );
}
