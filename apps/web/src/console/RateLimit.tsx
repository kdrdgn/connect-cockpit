import { useClient } from "@cockpit/client";
import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./Console.module.css";

/** The client's current rate-limit wait (a timestamp), set while a read waits out Retry-After. */
function useRateLimitedUntil(): number | null {
  const client = useClient();
  return useSyncExternalStore(client.onRateLimit, client.rateLimitedUntil, () => null);
}

/** "Waiting 3s…" counting down. The rows already on screen stay; this only says why new ones are late. */
export function RateLimitNotice() {
  const until = useRateLimitedUntil();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [until]);
  if (until === null) return null;
  const s = Math.max(1, Math.ceil((until - now) / 1000));
  return (
    <span className={styles.waiting} role="status">
      Waiting {s}s…
    </span>
  );
}
