import { makeListing } from "@cockpit/contract/testing";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { explainQueryOptions } from "./cache";
import { createClient, EXPLAIN_TIMEOUT_MS } from "./client";

const body = { marketplace: "seatgeek", lastError: "Timed out", price: 90, marketPrice: 120, quantity: 4 } as const;
const meta = { source: "mock", cached: false, inputTokens: 0, outputTokens: 0, latencyMs: 400 };

afterEach(() => vi.useRealTimers());

describe("explainSync", () => {
  it("resolves a failed answer's body instead of throwing", async () => {
    const client = createClient({
      fetch: async () => Response.json({ result: null, reason: "timeout", meta }, { status: 504 }),
    });
    await expect(client.explainSync(body)).resolves.toMatchObject({ result: null, reason: "timeout" });
  });

  it("aborts a slow request after 6 s", async () => {
    vi.useFakeTimers();
    let aborted: unknown;
    const client = createClient({
      fetch: (_url, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener("abort", () => {
            aborted = init.signal?.reason;
            reject(init.signal?.reason);
          }),
        ),
    });
    const pending = client.explainSync(body);
    const caught = pending.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(EXPLAIN_TIMEOUT_MS - 1);
    expect(aborted).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(await caught).toBeInstanceOf(Error);
  });
});

describe("explainQueryOptions", () => {
  const observe = (listing: ReturnType<typeof makeListing>) => {
    const fetch = vi.fn(async () => Response.json({ result: null, reason: "model_error", meta }));
    const observer = new QueryObserver(new QueryClient(), explainQueryOptions(createClient({ fetch }), listing, "seatgeek"));
    const stop = observer.subscribe(() => {});
    return { fetch, stop };
  };

  it("makes no request for a marketplace that is not in error", async () => {
    const { fetch, stop } = observe(makeListing());
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
    stop();
  });

  it("requests once for an errored marketplace", async () => {
    const listing = makeListing();
    listing.sync.seatgeek = { state: "error", updatedAt: listing.date, lastError: "Timed out" };
    const { fetch, stop } = observe(listing);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    stop();
  });
});
