import type { BulkOp, HistoryEntry, ListQueryInput, Listing } from "@cockpit/contract";
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
import { applyBulkResults } from "./bulk";
import { fetchListingsPage, keys, patchMutationOptions, retrySyncMutationOptions } from "./cache";

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

export type BulkVariables = { ops: BulkOp[]; idempotencyKey: string };

/** One bulk intent. Successful rows go straight into their cache entries; failed rows keep their values. */
export function useBulk() {
  const qc = useQueryClient();
  const client = useClient();
  return useMutation({
    mutationFn: ({ ops, idempotencyKey }: BulkVariables) => client.bulk(ops, idempotencyKey),
    onSuccess: (res) => applyBulkResults(qc, res.results),
  });
}

/**
 * Per-marketplace history for one listing, newest first. Keyed by the listing's sync timestamps too, so it
 * refetches when that listing drifts while the drawer is open.
 */
export function useHistory(id: string | null) {
  const client = useClient();
  const listing = useListing(id ?? "");
  const stamp = listing ? Object.values(listing.sync).map((s) => s.updatedAt).join("|") : "";
  return useQuery<HistoryEntry[]>({
    queryKey: [...keys.history(id ?? ""), stamp],
    queryFn: ({ signal }) => client.getHistory(id!, signal).then((r) => r.entries),
    enabled: id !== null,
    placeholderData: keepPreviousData,
  });
}

export function useRetrySync() {
  const qc = useQueryClient();
  const client = useClient();
  return useMutation(retrySyncMutationOptions(qc, client));
}
