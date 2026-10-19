import { isStalled, type LiveStatus } from "@cockpit/client";
import { useEffect, useState } from "react";
import styles from "./LiveIndicator.module.css";
import { useRateLimitedUntil } from "./RateLimit";

function useTick(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const secs = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

export type LiveContext = {
  /** False until the first page has loaded and polling can begin. */
  started: boolean;
  /** Set while a read the broker is waiting on sits out a 429's Retry-After. */
  waitUntil: number | null;
};

/** One status slot for freshness, waiting and stalls, so a notice never covers the table or contradicts "Live". */
export function liveText(s: LiveStatus, now: number, { started, waitUntil }: LiveContext): string {
  if (waitUntil !== null) return `Waiting ${Math.max(1, secs(waitUntil - now))}s…`;
  if (!started) return "Connecting…";
  if (isStalled(s)) return "Updates stalled. Retrying";
  if (s.hidden) return "Live · paused while hidden";
  if (s.pausedUntil !== null) return `Live · paused ${secs(s.pausedUntil - now)}s`;
  if (s.lastOkAt === null) return "Live";
  return `Live · ${secs(now - s.lastOkAt)}s ago`;
}

/**
 * Freshness, quietly. A rate-limited poll is not the broker's problem, so it stays quiet; a wait the broker is
 * blocked on ("Waiting 3s…") and a stall use the attention colour, and each is announced once when it starts.
 */
export function LiveIndicator({ status, started }: { status: LiveStatus; started: boolean }) {
  const waitUntil = useRateLimitedUntil();
  const now = useTick(waitUntil !== null ? 250 : 1000);
  const stalled = isStalled(status);
  const attention = stalled || waitUntil !== null;
  return (
    <span className={attention ? `${styles.live} ${styles.stalled}` : styles.live}>
      <span className={styles.dot} aria-hidden="true" />
      <span aria-hidden="true">{liveText(status, now, { started, waitUntil })}</span>
      <span className="srOnly" role="status">
        {waitUntil !== null ? "Rate limited. Waiting to load more listings." : stalled ? "Live updates stalled. Retrying." : ""}
      </span>
    </span>
  );
}
