"use client";

import { type Engine, createEngine, describeChaos, parseChaosParams } from "@cockpit/mock";
import { useToasts } from "@/ui/Toast";
import { type ReactNode, useEffect, useState } from "react";

let engine: Engine | null = null;
let ready: Promise<unknown> | null = null;

/** Starts the in-browser mock once per page load. State is never persisted; a reload starts clean. */
function startMock(): Promise<unknown> {
  if (!ready) {
    ready = import("@cockpit/mock/msw").then(({ startMockWorker }) => {
      const { config, ignored } = parseChaosParams(new URLSearchParams(window.location.search));
      engine = createEngine({ config });
      engine.start();
      // Say what the mock is doing, so a URL param that didn't take is visible rather than a silent default.
      console.info(`[mock] ${describeChaos(engine.config)}`);
      for (const p of ignored) {
        console.warn(`[mock] ignored ${p.key}=${p.value}: ${p.reason}. Using ${p.using}.`);
        useToasts.getState().show({
          id: `mock-param:${p.key}`,
          tone: "attention",
          title: `Mock setting ignored: ${p.key}=${p.value}`,
          body: `${p.reason[0]!.toUpperCase()}${p.reason.slice(1)}. Using ${p.using}.`,
        });
      }
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
