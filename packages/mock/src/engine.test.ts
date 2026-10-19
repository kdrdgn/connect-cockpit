import {
  BulkResponse,
  ChangesResponse,
  ErrorEnvelope,
  HistoryResponse,
  Listing,
  ListResponse,
  type BulkOp,
} from "@cockpit/contract";
import { describe, expect, it, vi } from "vitest";
import { type ChaosConfig, parseChaos, writeFails } from "./chaos";
import { createEngine } from "./engine";

const T0 = Date.parse("2026-10-19T12:00:00.000Z");
const BASE = "http://mock/api/listings";

function setup(config: Partial<ChaosConfig> = {}) {
  let t = T0;
  const sleeps: number[] = [];
  const engine = createEngine({
    config: { chaos: false, seed: 7, latency: [0, 0], failRate: 0, rate429: 0, ...config },
    now: () => t,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
  const call = async (path: string, init?: RequestInit) => {
    const res = await engine.handle(new Request(`${BASE}${path}`, init));
    return { res, body: (await res.json()) as unknown };
  };
  const send = (method: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
    call(path, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...headers } });
  return { engine, call, send, sleeps, advance: (ms: number) => (t += ms) };
}

describe("chaos config", () => {
  it("yields no failures and no 429s across 200 calls with chaos=off", async () => {
    const config = parseChaos(new URLSearchParams("chaos=off&seed=3"));
    const { engine, call, send } = setup(config);
    const statuses: number[] = [];
    for (let i = 0; i < 100; i++) statuses.push((await call("?limit=5")).res.status);
    for (const l of engine.all().slice(0, 100)) {
      statuses.push((await send("PATCH", `/${l.id}`, { version: l.version, price: l.price + 1 })).res.status);
    }
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it("defaults to the brief's numbers", () => {
    const c = parseChaos(new URLSearchParams(""));
    expect(c).toMatchObject({ chaos: true, latency: [300, 800], failRate: 15, rate429: 5 });
  });
});

describe("GET /listings", () => {
  it("filters by marketplace and state, and total counts all matches", async () => {
    const { engine, call } = setup();
    const { body } = await call("?sync=stubhub:error&limit=5");
    const list = ListResponse.parse(body);
    const expected = engine.all().filter((l) => l.sync.stubhub.state === "error");
    expect(list.total).toBe(expected.length);
    expect(list.items.every((l) => l.sync.stubhub.state === "error")).toBe(true);
  });

  it("combines sync values with OR and other kinds with AND", async () => {
    const { engine, call } = setup();
    const { body } = await call("?sync=stubhub:error&sync=seatgeek:error&section=104&limit=200");
    const list = ListResponse.parse(body);
    const expected = engine
      .all()
      .filter((l) => l.section === "104" && (l.sync.stubhub.state === "error" || l.sync.seatgeek.state === "error"));
    expect(list.items.map((l) => l.id).sort()).toEqual(expected.map((l) => l.id).sort());
  });

  it("walks the cursor and returns every match exactly once", async () => {
    const { engine, call } = setup();
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const { body } = await call(`?sort=price:desc&limit=37${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
      const list = ListResponse.parse(body);
      seen.push(...list.items.map((l) => l.id));
      cursor = list.nextCursor;
    } while (cursor);
    expect(seen).toHaveLength(engine.all().length);
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("PATCH /listings/:id", () => {
  it("rejects a stale version with 409 and the current listing, and changes nothing", async () => {
    const { engine, send } = setup();
    const l = engine.all()[0]!;
    const { res, body } = await send("PATCH", `/${l.id}`, { version: l.version - 1, price: 999 });
    expect(res.status).toBe(409);
    const env = ErrorEnvelope.parse(body);
    expect(env.current).toEqual(l);
    expect(engine.get(l.id)).toEqual(l);
  });

  it("bumps the version and sends live marketplaces to pending", async () => {
    const { engine, send } = setup();
    const l = engine.all().find((x) => x.sync.stubhub.state === "live")!;
    const { body } = await send("PATCH", `/${l.id}`, { version: l.version, price: l.price + 10 });
    const next = Listing.parse(body);
    expect(next.version).toBe(l.version + 1);
    expect(next.price).toBe(l.price + 10);
    expect(next.sync.stubhub.state).toBe("pending");
  });
});

describe("POST /listings/bulk", () => {
  const opsFor = (ls: Listing[]): BulkOp[] =>
    ls.map((l) => ({ op: "setPrice", id: l.id, version: l.version, price: l.price + 1 }));

  it("fails the same listings regardless of order", async () => {
    const a = setup({ failRate: 15 });
    const b = setup({ failRate: 15 });
    const ls = a.engine.all().slice(0, 40);
    const run = async (s: typeof a, ops: BulkOp[]) => {
      const { body } = await s.send("POST", "/bulk", { ops }, { "Idempotency-Key": "k1" });
      return BulkResponse.parse(body).results.filter((r) => !r.ok).map((r) => r.id).sort();
    };
    const failedA = await run(a, opsFor(ls));
    const failedB = await run(b, opsFor(ls).reverse());
    expect(failedA.length).toBeGreaterThan(0);
    expect(failedA).toEqual(failedB);
    expect(failedA).toEqual(ls.filter((l) => writeFails(7, l.id, 1, 15)).map((l) => l.id).sort());
  });

  it("replays the stored result for the same Idempotency-Key without applying twice", async () => {
    const { engine, send } = setup();
    const l = engine.all()[0]!;
    const ops = opsFor([l]);
    const first = await send("POST", "/bulk", { ops }, { "Idempotency-Key": "same" });
    const second = await send("POST", "/bulk", { ops }, { "Idempotency-Key": "same" });
    expect(second.body).toEqual(first.body);
    expect(engine.get(l.id)!.price).toBe(l.price + 1);
    expect(engine.get(l.id)!.version).toBe(l.version + 1);
  });

  it("counts a retry as a new attempt", async () => {
    const { engine, send } = setup({ failRate: 15 });
    const l = engine.all().find((x) => writeFails(7, x.id, 1, 15) && !writeFails(7, x.id, 2, 15))!;
    const first = await send("POST", "/bulk", { ops: opsFor([l]) }, { "Idempotency-Key": "a" });
    expect(BulkResponse.parse(first.body).results[0]!.ok).toBe(false);
    const retry = await send("POST", "/bulk", { ops: opsFor([l]) }, { "Idempotency-Key": "b" });
    expect(BulkResponse.parse(retry.body).results[0]!.ok).toBe(true);
  });

  it("requires an Idempotency-Key", async () => {
    const { engine, send } = setup();
    const { res } = await send("POST", "/bulk", { ops: opsFor(engine.all().slice(0, 1)) });
    expect(res.status).toBe(400);
  });
});

describe("retry-sync and history", () => {
  it("sets the marketplace to pending and adds a newest-first history entry", async () => {
    const { engine, send, call } = setup();
    const l = engine.all().find((x) => x.sync.stubhub.state === "error")!;
    const { body } = await send("POST", `/${l.id}/retry-sync`, { marketplace: "stubhub" });
    expect(Listing.parse(body).sync.stubhub.state).toBe("pending");
    const history = HistoryResponse.parse((await call(`/${l.id}/history`)).body);
    expect(history.entries[0]).toMatchObject({ marketplace: "stubhub", state: "pending" });
  });
});

describe("drift and changes", () => {
  it("delivers sync changes and never changes price except the seeded event", async () => {
    const { engine, call, advance } = setup();
    const before = new Map(engine.all().map((l) => [l.id, l]));
    const start = ListResponse.parse((await call("?limit=1")).body).changesCursor;
    for (let i = 0; i < 10; i++) {
      advance(3_000);
      engine.tick();
    }
    const { changes } = ChangesResponse.parse((await call(`/changes?since=${start}`)).body);
    expect(changes.length).toBeGreaterThan(0);
    const priceChanged = changes.filter((c) => c.price !== before.get(c.id)!.price || c.quantity !== before.get(c.id)!.quantity);
    expect(priceChanged).toHaveLength(0);

    // Past 60s the single "edited elsewhere" change fires.
    for (let i = 0; i < 12; i++) {
      advance(3_000);
      engine.tick();
    }
    const later = ChangesResponse.parse((await call(`/changes?since=${start}`)).body);
    expect(later.changes.filter((c) => c.price !== before.get(c.id)!.price)).toHaveLength(1);
  });
});

describe("latency and 429", () => {
  it("waits between 300 and 800 ms by default", async () => {
    const { call, sleeps } = setup({ latency: [300, 800] });
    for (let i = 0; i < 30; i++) await call("?limit=1");
    expect(sleeps.every((ms) => ms >= 300 && ms <= 800)).toBe(true);
  });

  it("returns 429 with Retry-After seconds and a retryable envelope", async () => {
    const { call } = setup({ rate429: 100 });
    const { res, body } = await call("?limit=1");
    expect(res.status).toBe(429);
    const seconds = Number(res.headers.get("Retry-After"));
    expect(Number.isInteger(seconds) && seconds >= 1).toBe(true);
    const env = ErrorEnvelope.parse(body);
    expect(env.error).toMatchObject({ code: "RATE_LIMITED", retryable: true, retryAfterMs: seconds * 1000 });
  });

  it("aborts the wait when the request is cancelled", async () => {
    vi.useFakeTimers();
    const engine = createEngine({ config: { seed: 1, latency: [500, 500], rate429: 0 } });
    const controller = new AbortController();
    const pending = engine.handle(new Request(`${BASE}?limit=1`, { signal: controller.signal }));
    controller.abort();
    await expect(pending).rejects.toBeDefined();
    vi.useRealTimers();
  });
});
