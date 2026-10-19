import type { Engine } from "./engine";

const ORIGIN = "http://mock.local";

/** A `fetch` that answers from the engine without any network, for React Native and tests. */
export function createInProcessFetch(engine: Engine): typeof fetch {
  return (input, init) => {
    const request =
      input instanceof Request ? input : new Request(new URL(String(input), ORIGIN).toString(), init);
    return engine.handle(request);
  };
}
