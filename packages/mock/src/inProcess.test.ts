import { ListResponse } from "@cockpit/contract";
import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";
import { createInProcessFetch } from "./inProcess";

describe("createInProcessFetch", () => {
  it("answers relative URLs from the engine", async () => {
    const engine = createEngine({ config: { seed: 1, latency: [0, 0], rate429: 0 } });
    const fetch = createInProcessFetch(engine);
    const res = await fetch("/api/listings?limit=3");
    expect(res.status).toBe(200);
    expect(ListResponse.parse(await res.json()).items).toHaveLength(3);
  });
});
