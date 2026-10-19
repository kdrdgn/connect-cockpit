import { createEngine, createInProcessFetch } from "@cockpit/mock";
import { describe, expect, it, vi } from "vitest";
import { ApiError, createClient } from "./client";

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

const rateLimited = (seconds: number) =>
  jsonResponse(
    429,
    { error: { code: "RATE_LIMITED", message: "Slow down", retryable: true, retryAfterMs: seconds * 1000 } },
    { "Retry-After": String(seconds) },
  );

describe("createClient", () => {
  it("lists through an injected in-process transport", async () => {
    const engine = createEngine({ config: { seed: 1, latency: [0, 0], rate429: 0 } });
    const client = createClient({ fetch: createInProcessFetch(engine) });
    const list = await client.listListings({ limit: 5, sync: [{ marketplace: "stubhub", state: "live" }] });
    expect(list.items).toHaveLength(5);
  });

  it("turns a malformed body into an INTERNAL error", async () => {
    const client = createClient({ fetch: async () => jsonResponse(200, { total: 3 }) });
    await expect(client.listListings({})).rejects.toMatchObject({ code: "INTERNAL" });
  });

  it("waits Retry-After on a 429 read, reports the wait, then retries", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValueOnce(rateLimited(3)).mockResolvedValueOnce(
      jsonResponse(200, { items: [], nextCursor: null, total: 0, changesCursor: "0" }),
    );
    const sleeps: number[] = [];
    const reported: (number | null)[] = [];
    const client = createClient({ fetch, now: () => 1_000, sleep: async (ms) => void sleeps.push(ms) });
    client.onRateLimit((until) => reported.push(until));

    await client.listListings({});
    expect(sleeps).toEqual([3000]);
    expect(reported).toEqual([4_000, null]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a rate-limited write", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(rateLimited(2));
    const client = createClient({ fetch, sleep: async () => {} });
    const error = await client.patchListing("L0001", { version: 1, price: 10 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "RATE_LIMITED", retryAfterMs: 2000 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
