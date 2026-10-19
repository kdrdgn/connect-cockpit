import { ClientProvider, createClient, keys } from "@cockpit/client";
import type { Listing } from "@cockpit/contract";
import { createEngine, createInProcessFetch } from "@cockpit/mock";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { EditController } from "./EditController";

/** A console-shaped harness: an in-process mock with chaos off, a real client and query cache, and a fetch spy. */
export async function harness(config: Parameters<typeof createEngine>[0] = {}) {
  const engine = createEngine({ config: { chaos: false, latency: [0, 0], failRate: 0, rate429: 0, ...config.config } });
  const base = createInProcessFetch(engine);
  const calls: { method: string; url: string; body: unknown }[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const method = init?.method ?? "GET";
    calls.push({ method, url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return base(input, init);
  };
  const client = createClient({ fetch, maxReadRetries: 0 });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const page = await client.listListings({ limit: 20 });
  for (const l of page.items) qc.setQueryData<Listing>(keys.listing(l.id), l);
  calls.length = 0;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <ClientProvider client={client}>
        <EditController>{children}</EditController>
      </ClientProvider>
    </QueryClientProvider>
  );
  const writes = () => calls.filter((c) => c.method !== "GET");
  return { engine, client, qc, wrapper, calls, writes, listings: page.items };
}
