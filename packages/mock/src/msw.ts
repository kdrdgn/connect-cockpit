// Browser adapter. Kept on its own entry point so mobile never pulls in MSW.
import { setupWorker } from "msw/browser";
import { http } from "msw/http";
import type { Engine } from "./engine";

/** Intercepts only `/api/listings*`, so other routes (e.g. the AI route) reach the real server. */
export function startMockWorker(engine: Engine) {
  const worker = setupWorker(http.all("*/api/listings*", ({ request }) => engine.handle(request)));
  return worker.start({ onUnhandledFrame: "bypass", quiet: true });
}
