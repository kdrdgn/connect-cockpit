import type { ListQueryInput, Listing } from "@cockpit/contract";
import {
  keepPreviousData,
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode, createContext, useContext } from "react";
import type { Client } from "./client";
import { fetchListingsPage, keys, patchMutationOptions } from "./cache";

const ClientContext = createContext<Client | null>(null);

export function ClientProvider({ client, children }: { client: Client; children: ReactNode }) {
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
}

export function useClient(): Client {
  const client = useContext(ClientContext);
  if (!client) throw new Error("useClient must be used inside <ClientProvider>");
  return client;
}

/** Pages of ids for a filter. Keeps the previous result on screen while a new filter loads. */
export function useListings(filters: ListQueryInput) {
  const qc = useQueryClient();
  const client = useClient();
  return useInfiniteQuery({
    queryKey: keys.listings(filters),
    queryFn: ({ pageParam, signal }) => fetchListingsPage(qc, client, filters, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

/** One row's data. Never fetches on its own; entries are filled by list pages, changes and writes. */
export function useListing(id: string): Listing | undefined {
  return useQuery<Listing>({ queryKey: keys.listing(id), queryFn: skipToken, staleTime: Infinity }).data;
}

export function usePatchListing() {
  const qc = useQueryClient();
  const client = useClient();
  return useMutation(patchMutationOptions(qc, client));
}
