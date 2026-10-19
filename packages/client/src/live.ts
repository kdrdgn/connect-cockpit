import type { ChangesResponse, Listing } from "@cockpit/contract";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { applyChanges } from "./cache";
import { ApiError } from "./client";
import { useClient } from "./hooks";

export type LiveStatus = {
  /** When the last poll succeeded. */
  lastOkAt: number | null;
  /** Set while a rate-limited poll waits out its Retry-After. */
  pausedUntil: number | null;
  /** Consecutive failed polls (rate limits don't count). */
  failures: number;
  /** Polling stopped because the page is hidden. */
  hidden: boolean;
};

export const STALL_AFTER_FAILURES = 3;
export const isStalled = (s: LiveStatus) => s.failures >= STALL_AFTER_FAILURES;

export type PollerDeps = {
  getChanges: (since: string, signal: AbortSignal) => Promise<ChangesResponse>;
  apply: (changes: Listing[]) => void;
  intervalMs?: number;
  now?: () => number;
  isHidden?: () => boolean;
  /** Subscribes to visibility changes; returns an unsubscribe. */
  onVisibilityChange?: (listener: () => void) => () => void;
};

/** Where "hidden" comes from: `document` in a browser by default, `AppState` on React Native. */
export type VisibilitySource = {
  isHidden: () => boolean;
  /** Called on every change; returns an unsubscribe. */
  subscribe: (listener: () => void) => () => void;
};

export const visibilityDeps = (source: VisibilitySource | undefined): Pick<PollerDeps, "isHidden" | "onVisibilityChange"> =>
  source ? { isHidden: source.isHidden, onVisibilityChange: source.subscribe } : {};

/**
 * Polls `/listings/changes` from a cursor. A setTimeout loop, not setInterval, so a slow response never
 * stacks a second request. Hidden pages don't poll; becoming visible makes one immediate catch-up call.
 */
export function createPoller(cursor: string, deps: PollerDeps) {
  const { getChanges, apply, intervalMs = 3000, now = Date.now } = deps;
  const isHidden = deps.isHidden ?? (() => typeof document !== "undefined" && document.visibilityState === "hidden");
  let status: LiveStatus = { lastOkAt: null, pausedUntil: null, failures: 0, hidden: isHidden() };
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: AbortController | null = null;
  let stopped = false;

  const set = (patch: Partial<LiveStatus>) => {
    status = { ...status, ...patch };
    for (const l of listeners) l();
  };

  const schedule = (ms: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(poll, ms);
  };

  async function poll() {
    timer = null;
    if (stopped || inFlight) return;
    if (isHidden()) {
      set({ hidden: true });
      return; // resumed by the visibility listener
    }
    inFlight = new AbortController();
    try {
      const res = await getChanges(cursor, inFlight.signal);
      cursor = res.changesCursor;
      if (res.changes.length) apply(res.changes);
      set({ lastOkAt: now(), pausedUntil: null, failures: 0, hidden: false });
      schedule(intervalMs);
    } catch (e) {
      if (stopped) return;
      if (e instanceof ApiError && e.code === "RATE_LIMITED") {
        const wait = e.retryAfterMs ?? intervalMs;
        set({ pausedUntil: now() + wait });
        schedule(wait);
      } else {
        set({ failures: status.failures + 1, pausedUntil: null });
        schedule(intervalMs);
      }
    } finally {
      inFlight = null;
    }
  }

  const onVisibility = () => {
    if (stopped) return;
    if (isHidden()) {
      if (timer) clearTimeout(timer);
      timer = null;
      inFlight?.abort();
      set({ hidden: true });
    } else {
      set({ hidden: false });
      void poll(); // catch up from the stored cursor at once
    }
  };
  const unsubscribeVisibility =
    deps.onVisibilityChange?.(onVisibility) ??
    (typeof document !== "undefined"
      ? (document.addEventListener("visibilitychange", onVisibility),
        () => document.removeEventListener("visibilitychange", onVisibility))
      : () => {});

  schedule(intervalMs);

  return {
    getStatus: () => status,
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    /** For the demo panel and tests: poll now instead of waiting for the timer. */
    pollNow: () => void poll(),
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      inFlight?.abort();
      unsubscribeVisibility();
    },
  };
}

export type Poller = ReturnType<typeof createPoller>;

const IDLE: LiveStatus = { lastOkAt: null, pausedUntil: null, failures: 0, hidden: false };
const noop = () => () => {};

/**
 * Keeps listings current. Starts once a cursor is known (from the first list page) and keeps its own cursor
 * after that, so a filter change never rewinds it. Changes go through `applyChanges`: one entry per listing.
 * `visibility` must be stable (a module constant): a new object restarts the poller.
 */
export function useLiveChanges(
  cursor: string | undefined,
  options: { intervalMs?: number; enabled?: boolean; visibility?: VisibilitySource } = {},
) {
  const { intervalMs = 3000, enabled = true, visibility } = options;
  const qc = useQueryClient();
  const client = useClient();
  const [poller, setPoller] = useState<Poller | null>(null);
  const started = cursor !== undefined && enabled;

  useEffect(() => {
    if (!started || cursor === undefined) return;
    const p = createPoller(cursor, {
      getChanges: (since, signal) => client.getChanges(since, signal, { retryRateLimit: false }),
      apply: (changes) => applyChanges(qc, changes),
      intervalMs,
      ...visibilityDeps(visibility),
    });
    setPoller(p);
    return () => {
      p.stop();
      setPoller(null);
    };
    // The cursor only seeds the poller; later list pages must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, client, qc, intervalMs, visibility]);

  const status = useSyncExternalStore(poller?.subscribe ?? noop, () => poller?.getStatus() ?? IDLE, () => IDLE);
  return { status, pollNow: () => poller?.pollNow() };
}
