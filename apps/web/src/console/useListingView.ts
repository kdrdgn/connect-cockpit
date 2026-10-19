import { useListings } from "@cockpit/client";
import type { ListQueryInput } from "@cockpit/contract";
import { useEffect, useMemo } from "react";

// The contract's maximum: 500 listings load in three requests, so the full problem count arrives sooner.
export const PAGE_SIZE = 200;

/**
 * The whole filtered view, loaded page by page in the background (design W5), so the problem count, n/N and
 * select-all cover every row. `ids` is as long as `total`; indexes not loaded yet are undefined.
 */
export function useListingView(filters: ListQueryInput) {
  const query = useListings({ ...filters, limit: PAGE_SIZE });
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = query;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const loaded = useMemo(() => data?.pages.flatMap((p) => p.ids) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const ids = useMemo(() => {
    const all: (string | undefined)[] = loaded.slice();
    all.length = Math.max(total, loaded.length);
    return all;
  }, [loaded, total]);

  return {
    ...query,
    ids,
    loadedIds: loaded,
    total,
    changesCursor: data?.pages[0]?.changesCursor,
    isComplete: !!data && !hasNextPage,
  };
}
