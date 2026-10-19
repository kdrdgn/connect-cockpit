import type { ChangesResponse, Listing } from "@cockpit/contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./client";
import { createPoller, isStalled, type PollerDeps } from "./live";

let hidden = false;
let visibility: (() => void) | null = null;

function setup(responses: (ChangesResponse | ApiError)[] = []) {
  const calls: string[] = [];
  const applied: Listing[][] = [];
  const deps: PollerDeps = {
    getChanges: async (since) => {
      calls.push(since);
      const next = responses.shift() ?? { changes: [], changesCursor: String(Number(since) + 1) };
      if (next instanceof ApiError) throw next;
      return next;
    },
    apply: (c) => applied.push(c),
    intervalMs: 3000,
    isHidden: () => hidden,
    onVisibilityChange: (l) => {
      visibility = l;
      return () => (visibility = null);
    },
  };
  return { poller: createPoller("0", deps), calls, applied };
}

const rateLimited = (ms: number) => new ApiError({ code: "RATE_LIMITED", message: "Slow down", retryable: true, retryAfterMs: ms }, 429);
const failed = () => new ApiError({ code: "INTERNAL", message: "boom", retryable: true }, 500);

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
});
afterEach(() => vi.useRealTimers());

describe("createPoller", () => {
  it("polls every interval and advances its cursor", async () => {
    const { poller, calls } = setup();
    await vi.advanceTimersByTimeAsync(9000);
    expect(calls).toEqual(["0", "1", "2"]);
    poller.stop();
  });

  it("sends nothing while hidden, then one catch-up call on visible", async () => {
    hidden = true;
    const { poller, calls } = setup();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toHaveLength(0);
    expect(poller.getStatus().hidden).toBe(true);
    hidden = false;
    visibility?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toEqual(["0"]);
    poller.stop();
  });

  it("a 429 pauses quietly for Retry-After and does not count as a failure", async () => {
    const { poller, calls } = setup([rateLimited(5000)]);
    await vi.advanceTimersByTimeAsync(3000);
    expect(poller.getStatus()).toMatchObject({ failures: 0 });
    expect(poller.getStatus().pausedUntil).not.toBeNull();
    await vi.advanceTimersByTimeAsync(4999);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls).toHaveLength(2);
    expect(poller.getStatus().pausedUntil).toBeNull();
    poller.stop();
  });

  it("three failures in a row mean stalled; one success clears it", async () => {
    const { poller } = setup([failed(), failed(), failed()]);
    await vi.advanceTimersByTimeAsync(9000);
    expect(isStalled(poller.getStatus())).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(isStalled(poller.getStatus())).toBe(false);
    expect(poller.getStatus().lastOkAt).not.toBeNull();
    poller.stop();
  });

  it("applies changes it receives", async () => {
    const listing = { id: "L1" } as Listing;
    const { poller, applied } = setup([{ changes: [listing], changesCursor: "5" }]);
    await vi.advanceTimersByTimeAsync(3000);
    expect(applied).toEqual([[listing]]);
    poller.stop();
  });
});

describe("client.getChanges for polls", () => {
  it("a rate-limited poll throws RATE_LIMITED without emitting the user-facing wait", async () => {
    vi.useRealTimers();
    const { createClient } = await import("./client");
    const body = { error: { code: "RATE_LIMITED", message: "Slow down", retryable: true, retryAfterMs: 3000 } };
    const fetch = async () => new Response(JSON.stringify(body), { status: 429, headers: { "Retry-After": "3" } });
    const client = createClient({ fetch });
    const waits: (number | null)[] = [];
    client.onRateLimit((u) => waits.push(u));
    await expect(client.getChanges("0", undefined, { retryRateLimit: false })).rejects.toMatchObject({ code: "RATE_LIMITED", retryAfterMs: 3000 });
    expect(waits).toEqual([]);
  });
});
