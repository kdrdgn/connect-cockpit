import { describe, expect, it } from "vitest";
import { ErrorEnvelope, parseListQuery, toSearchParams } from "./api";
import { makeListing } from "./testing";

describe("ErrorEnvelope", () => {
  it("requires the current listing on CONFLICT", () => {
    const error = { code: "CONFLICT", message: "Changed elsewhere", retryable: false } as const;
    expect(ErrorEnvelope.safeParse({ error }).success).toBe(false);
    expect(ErrorEnvelope.safeParse({ error, current: makeListing() }).success).toBe(true);
  });

  it("requires retryAfterMs on RATE_LIMITED", () => {
    const error = { code: "RATE_LIMITED", message: "Slow down", retryable: true } as const;
    expect(ErrorEnvelope.safeParse({ error }).success).toBe(false);
    expect(ErrorEnvelope.safeParse({ error: { ...error, retryAfterMs: 3000 } }).success).toBe(true);
  });
});

describe("list query params", () => {
  it("round-trips repeated sync filters", () => {
    const params = new URLSearchParams("sync=stubhub:error&sync=seatgeek:error&section=104");
    const query = parseListQuery(params);
    expect(query.sync).toEqual([
      { marketplace: "stubhub", state: "error" },
      { marketplace: "seatgeek", state: "error" },
    ]);
    expect(parseListQuery(toSearchParams(query))).toEqual(query);
  });

  it("rejects an unknown marketplace", () => {
    expect(() => parseListQuery(new URLSearchParams("sync=ebay:error"))).toThrow();
  });
});
