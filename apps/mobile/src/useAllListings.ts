import { keys, useListings } from '@cockpit/client';
import type { Listing } from '@cockpit/contract';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

/** The largest page the contract allows; 500 listings load in three in-process calls. */
export const PAGE_SIZE = 200;

/**
 * Every listing, page by page (the phone's mock is in-process, so this costs no network). The feed is built
 * from these on the phone, because the server's problem filter leaves out ordinary pending (design M1).
 */
export function useAllListings() {
  const qc = useQueryClient();
  const query = useListings({ limit: PAGE_SIZE });
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = query;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const ids = useMemo(() => data?.pages.flatMap((p) => p.ids) ?? [], [data]);

  /** Current listings from their own cache entries, so drift that arrived since loading is included. */
  const snapshot = useCallback(
    (): Listing[] => ids.flatMap((id) => qc.getQueryData<Listing>(keys.listing(id)) ?? []),
    [ids, qc],
  );

  return {
    ...query,
    snapshot,
    isComplete: !!data && !hasNextPage,
    changesCursor: data?.pages[0]?.changesCursor,
  };
}
