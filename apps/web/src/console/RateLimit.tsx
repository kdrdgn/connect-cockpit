import { useClient } from "@cockpit/client";
import { useSyncExternalStore } from "react";

/** The client's current rate-limit wait (a timestamp), set while a read waits out Retry-After. */
export function useRateLimitedUntil(): number | null {
  const client = useClient();
  return useSyncExternalStore(client.onRateLimit, client.rateLimitedUntil, () => null);
}
