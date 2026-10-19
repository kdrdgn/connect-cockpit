"use client";

import { type Engine, createEngine, parseChaos } from "@cockpit/mock";
import { type ReactNode, useEffect, useState } from "react";

let engine: Engine | null = null;
let ready: Promise<unknown> | null = null;

/** Starts the in-browser mock once per page load. State is never persisted; a reload starts clean. */
function startMock(): Promise<unknown> {
  if (!ready) {
    ready = import("@cockpit/mock/msw").then(({ startMockWorker }) => {
      engine = createEngine({ config: parseChaos(new URLSearchParams(window.location.search)) });
      engine.start();
      return startMockWorker(engine);
    });
  }
  return ready;
}

export function getMockEngine(): Engine | null {
  return engine;
}

/** Holds rendering until the service worker intercepts requests, so the first fetch never hits the network. */
export function MockProvider({ children }: { children: ReactNode }) {
  const [isReady, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void startMock().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return isReady ? children : null;
}
