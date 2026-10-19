import {
  type ExplainResponse,
  type ListQueryInput,
  type Listing,
  type Marketplace,
  type PatchBody,
  type SyncEntry,
  toExplainRequest,
} from "@cockpit/contract";
import { type MutationOptions, type QueryClient, type QueryObserverOptions, skipToken } from "@tanstack/react-query";
import { ApiError, type Client } from "./client";

// "Option Y": lists hold ids only; each listing lives in its own entry, so one change re-renders one row.
export const keys = {
  listings: (filters: ListQueryInput) => ["listings", filters] as const,
  listing: (id: string) => ["listing", id] as const,
  history: (id: string) => ["history", id] as const,
  /** By marketplace and error text, not listing: the same error on another listing reuses the answer. */
  explain: (marketplace: Marketplace, lastError: string) => ["explain", marketplace, lastError] as const,
};

export type ListingsPage = { ids: string[]; total: number; nextCursor: string | null; changesCursor: string };

export const PATCH_MUTATION_KEY = ["patch-listing"] as const;

/**
 * `baseVersion`: the version the edit started from. When set, a change that arrived mid-edit makes the write
 * fail with CONFLICT instead of silently overwriting it. Defaults to the cached version.
 */
export type PatchVariables = { id: string; baseVersion?: number } & Omit<PatchBody, "version">;
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
    mutationFn: async ({ id, baseVersion, ...patch }) => {
      const current = qc.getQueryData<Listing>(keys.listing(id));
      if (!current) throw new ApiError({ code: "NOT_FOUND", message: `Listing ${id} is not loaded`, retryable: false }, 0);
      return client.patchListing(id, { ...patch, version: baseVersion ?? current.version });
    },
    onMutate: ({ id, baseVersion: _, ...patch }) => {
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

export type RetrySyncVariables = { id: string; marketplace: Marketplace };
export type RetrySyncContext = { id: string; marketplace: Marketplace; before: SyncEntry } | undefined;

/** Retry-sync shows pending at once; a failed retry puts the marketplace back exactly as it was. */
export function retrySyncMutationOptions(
  qc: QueryClient,
  client: Client,
  now: () => number = Date.now,
): MutationOptions<Listing, ApiError, RetrySyncVariables, RetrySyncContext> {
  return {
    mutationFn: ({ id, marketplace }) => client.retrySync(id, marketplace),
    onMutate: ({ id, marketplace }) => {
      const key = keys.listing(id);
      const current = qc.getQueryData<Listing>(key);
      if (!current) return undefined;
      const before = current.sync[marketplace];
      const pending: SyncEntry = { ...before, state: "pending", lastError: undefined, updatedAt: new Date(now()).toISOString() };
      qc.setQueryData<Listing>(key, { ...current, sync: { ...current.sync, [marketplace]: pending } });
      return { id, marketplace, before };
    },
    onError: (_error, _vars, context) => {
      if (!context) return;
      const key = keys.listing(context.id);
      const current = qc.getQueryData<Listing>(key);
      if (current) qc.setQueryData<Listing>(key, { ...current, sync: { ...current.sync, [context.marketplace]: context.before } });
    },
    onSuccess: (listing) => {
      putListing(qc, listing);
      void qc.invalidateQueries({ queryKey: keys.history(listing.id) });
    },
  };
}

export function explainQueryOptions(client: Client, listing: Listing, marketplace: Marketplace): QueryObserverOptions<ExplainResponse> {
  const body = toExplainRequest(listing, marketplace);
  return {
    queryKey: keys.explain(marketplace, body?.lastError ?? ""),
    // No abort on unmount: a closed drawer's answer still lands in the cache, and StrictMode's
    // remount reuses the request instead of paying for a second model call. The 6 s timeout still applies.
    queryFn: body ? () => client.explainSync(body) : skipToken,
    staleTime: Infinity,
    retry: 0,
  };
}
