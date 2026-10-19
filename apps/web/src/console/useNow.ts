import { useSyncExternalStore } from "react";

// One shared clock. Only components that pass `enabled` subscribe, so a tick never re-renders the whole table.
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 5000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const noop = () => () => {};
const snapshot = () => now;

/** Current time, refreshed every 5 s while enabled. Disabled callers read the shared clock without subscribing. */
export function useNow(enabled = true): number {
  return useSyncExternalStore(enabled ? subscribe : noop, snapshot, snapshot);
}
