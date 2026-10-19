import type { Listing } from "@cockpit/contract";
import { createEngine, createInProcessFetch } from "@cockpit/mock";
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { keys, retrySyncMutationOptions } from "./cache";
import { ApiError, createClient } from "./client";

async function setup() {
  const engine = createEngine({ config: { chaos: false, latency: [0, 0], failRate: 0, rate429: 0 } });
  const client = createClient({ fetch: createInProcessFetch(engine) });
  const qc = new QueryClient();
  const { items } = await client.listListings({ limit: 200 });
  for (const l of items) qc.setQueryData(keys.listing(l.id), l);
  const errored = items.find((l) => l.sync.stubhub.state === "error")!;
  return { engine, client, qc, errored };
}

describe("retry sync", () => {
  it("sets the marketplace to pending at once and records history", async () => {
    const { client, qc, errored } = await setup();
    const m = new MutationObserver(qc, retrySyncMutationOptions(qc, client));
    const done = m.mutate({ id: errored.id, marketplace: "stubhub" });
    await Promise.resolve();
    expect(qc.getQueryData<Listing>(keys.listing(errored.id))?.sync.stubhub.state).toBe("pending");
    await done;
    expect(qc.getQueryData<Listing>(keys.listing(errored.id))?.sync.stubhub.state).toBe("pending");
    const { entries } = await client.getHistory(errored.id);
    expect(entries[0]).toMatchObject({ marketplace: "stubhub", state: "pending" });
  });

  it("a failed retry restores the exact previous state", async () => {
    const { client, qc, errored } = await setup();
    const failing = { ...client, retrySync: async () => { throw new ApiError({ code: "MARKETPLACE_REJECTED", message: "no", retryable: true }, 502); } };
    const m = new MutationObserver(qc, retrySyncMutationOptions(qc, failing));
    await m.mutate({ id: errored.id, marketplace: "stubhub" }).catch(() => {});
    expect(qc.getQueryData<Listing>(keys.listing(errored.id))?.sync.stubhub).toEqual(errored.sync.stubhub);
  });
});
