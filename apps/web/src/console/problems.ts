import { keys } from "@cockpit/client";
import { compareProblems, isProblem, type Listing } from "@cockpit/contract";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useSyncExternalStore } from "react";
import { useNow } from "./useNow";

/** Problem listings in the contract's ranking: mismatch > error > stale pending > overpriced, soonest event first. */
export function problemOrder(listings: readonly Listing[], now: number): string[] {
  return listings
    .filter((l) => isProblem(l, now))
    .sort((a, b) => compareProblems(a, b, now))
    .map((l) => l.id);
}

/** Bumps whenever any listing entry changes, so the order follows drift without re-rendering rows. */
function useListingCacheVersion() {
  const qc = useQueryClient();
  return useSyncExternalStore(
    (onChange) => {
      let pending = false;
      return qc.getQueryCache().subscribe((e) => {
        if (e.type !== "updated" || e.query.queryKey[0] !== "listing" || pending) return;
        // Coalesce a poll's burst of updates into one recompute.
        pending = true;
        queueMicrotask(() => {
          pending = false;
          version++;
          onChange();
        });
      });
    },
    () => version,
    () => version,
  );
}
let version = 0;

/**
 * The problem list for the loaded view. The toolbar count and n/N both read this one list, so they can't
 * disagree. Recomputed on listing changes and on a 5 s clock, so pending turns stale without a poll.
 */
export function useProblemOrder(loadedIds: readonly string[]) {
  const qc = useQueryClient();
  const cacheVersion = useListingCacheVersion();
  const now = useNow(true);
  return useMemo(() => {
    const listings = loadedIds.flatMap((id) => qc.getQueryData<Listing>(keys.listing(id)) ?? []);
    const order = problemOrder(listings, now);
    const indexOf = new Map(loadedIds.map((id, i) => [id, i]));
    return { order, indexOf };
    // cacheVersion is the signal that listing entries changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedIds, cacheVersion, now, qc]);
}

/** Where n/N go from here: the problem after (or before) the focused row's place in the ranking, wrapping. */
export function stepProblem(order: readonly string[], currentId: string | null, dir: 1 | -1): string | null {
  if (order.length === 0) return null;
  const at = currentId ? order.indexOf(currentId) : -1;
  if (at === -1) return dir === 1 ? order[0]! : order[order.length - 1]!;
  return order[(at + dir + order.length) % order.length]!;
}
