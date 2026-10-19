import { isStalled, type LiveStatus } from "@cockpit/client";
import { useEffect, useState } from "react";
import styles from "./LiveIndicator.module.css";

function useSecondTick() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const secs = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

export function liveText(s: LiveStatus, now: number): string {
  if (isStalled(s)) return "Updates stalled. Retrying";
  if (s.hidden) return "Live · paused while hidden";
  if (s.pausedUntil !== null) return `Live · paused ${secs(s.pausedUntil - now)}s`;
  if (s.lastOkAt === null) return "Live";
  return `Live · ${secs(now - s.lastOkAt)}s ago`;
}

/**
 * Freshness, quietly. A rate-limited poll is not the broker's problem, so it never alerts; only a stall is
 * announced, once, when it starts.
 */
export function LiveIndicator({ status }: { status: LiveStatus }) {
  const now = useSecondTick();
  const stalled = isStalled(status);
  return (
    <span className={stalled ? `${styles.live} ${styles.stalled}` : styles.live}>
      <span className={styles.dot} aria-hidden="true" />
      <span aria-hidden="true">{liveText(status, now)}</span>
      <span className="srOnly" role="status">
        {stalled ? "Live updates stalled. Retrying." : ""}
      </span>
    </span>
  );
}
