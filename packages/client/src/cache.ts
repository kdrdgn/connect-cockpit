import type { ListQueryInput, Listing, PatchBody } from "@cockpit/contract";
import type { MutationOptions, QueryClient } from "@tanstack/react-query";
import { ApiError, type Client } from "./client";

// "Option Y": lists hold ids only; each listing lives in its own entry, so one change re-renders one row.
export const keys = {
  listings: (filters: ListQueryInput) => ["listings", filters] as const,
  listing: (id: string) => ["listing", id] as const,
};

export type ListingsPage = { ids: string[]; total: number; nextCursor: string | null; changesCursor: string };

export const PATCH_MUTATION_KEY = ["patch-listing"] as const;

export type PatchVariables = { id: string } & Omit<PatchBody, "version">;
export type PatchContext = { id: string; before: Pick<Listing, "price" | "quantity"> } | undefined;

/** True while a write for this listing is in flight; incoming data must not undo its optimistic value. */
export function isWriting(qc: QueryClient, id: string): boolean {
  return (
    qc.isMutating({
      mutationKey: PATCH_MUTATION_KEY,
      predicate: (m) => (m.state.variables as PatchVariables | undefined)?.id === id,
    }) > 0
  );
}

/** Writes a server listing into its entry. Mid-write, only sync is taken so the optimistic edit stays visible. */
export function putListing(qc: QueryClient, listing: Listing): void {
  const key = keys.listing(listing.id);
  if (isWriting(qc, listing.id)) {
    const current = qc.getQueryData<Listing>(key);
    if (current) {
      qc.setQueryData<Listing>(key, { ...current, sync: listing.sync });
      return;
    }
  }
  qc.setQueryData<Listing>(key, listing);
}

/** Fetches one page and seeds per-listing entries. Parsing happens first, so a bad body caches nothing. */
export async function fetchListingsPage(
  qc: QueryClient,
  client: Client,
  filters: ListQueryInput,
  cursor: string | undefined,
  signal?: AbortSignal,
): Promise<ListingsPage> {
  const res = await client.listListings({ ...filters, ...(cursor ? { cursor } : {}) }, signal);
  for (const l of res.items) putListing(qc, l);
  return { ids: res.items.map((l) => l.id), total: res.total, nextCursor: res.nextCursor, changesCursor: res.changesCursor };
}

/** Applies polled changes surgically: only the changed listings' entries get new identities. */
export function applyChanges(qc: QueryClient, changes: Listing[]): void {
  for (const l of changes) putListing(qc, l);
}

/** Mutation options for an optimistic single-listing edit. The React hook and the tests use the same object. */
export function patchMutationOptions(
  qc: QueryClient,
  client: Client,
): MutationOptions<Listing, ApiError, PatchVariables, PatchContext> {
  return {
    mutationKey: PATCH_MUTATION_KEY,
    mutationFn: async ({ id, ...patch }) => {
      const current = qc.getQueryData<Listing>(keys.listing(id));
      if (!current) throw new ApiError({ code: "NOT_FOUND", message: `Listing ${id} is not loaded`, retryable: false }, 0);
      return client.patchListing(id, { ...patch, version: current.version });
    },
    onMutate: ({ id, ...patch }) => {
      const key = keys.listing(id);
      const current = qc.getQueryData<Listing>(key);
      if (!current) return undefined;
      qc.setQueryData<Listing>(key, { ...current, ...patch });
      return { id, before: { price: current.price, quantity: current.quantity } };
    },
    onError: (error, _vars, context) => {
      if (!context) return;
      const key = keys.listing(context.id);
      // On conflict the server's version wins; otherwise restore exactly what was there before the edit.
      if (error.current) {
        qc.setQueryData<Listing>(key, error.current);
        return;
      }
      const current = qc.getQueryData<Listing>(key);
      if (current) qc.setQueryData<Listing>(key, { ...current, ...context.before });
    },
    onSuccess: (listing) => {
      qc.setQueryData<Listing>(keys.listing(listing.id), listing);
    },
  };
}
