import type { Listing } from "@cockpit/contract";
import { makeListing } from "@cockpit/contract/testing";
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ApiError, type Client, createClient } from "./client";
import { applyChanges, keys, patchMutationOptions } from "./cache";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function setup(respond: () => Response) {
  const qc = new QueryClient();
  const client: Client = createClient({ fetch: async () => respond() });
  const listing = makeListing({ id: "L0001", price: 120, version: 3 });
  qc.setQueryData(keys.listing(listing.id), listing);
  const observer = new MutationObserver(qc, patchMutationOptions(qc, client));
  return { qc, listing, observer };
}

describe("optimistic patch", () => {
  it("shows the new value at once and restores exactly 120 when the write fails", async () => {
    const failure = { error: { code: "MARKETPLACE_REJECTED", message: "StubHub rejected the update", retryable: true } };
    const { qc, observer } = setup(() => json(422, failure));
    const seen: number[] = [];
    const unsubscribe = qc.getQueryCache().subscribe(() => {
      const l = qc.getQueryData<Listing>(keys.listing("L0001"));
      if (l && seen[seen.length - 1] !== l.price) seen.push(l.price);
    });

    const error = await observer.mutate({ id: "L0001", price: 130 }).catch((e: unknown) => e);
    unsubscribe();
    expect(error).toBeInstanceOf(ApiError);
    expect(observer.getCurrentResult().variables?.id).toBe("L0001");
    expect(seen).toEqual([130, 120]);
    expect(qc.getQueryData<Listing>(keys.listing("L0001"))?.price).toBe(120);
  });

  it("stores the server listing with its new version on success", async () => {
    const { qc, listing, observer } = setup(() => json(200, { ...makeListing({ id: "L0001" }), price: 130, version: 4 }));
    await observer.mutate({ id: listing.id, price: 130 });
    expect(qc.getQueryData<Listing>(keys.listing("L0001"))).toMatchObject({ price: 130, version: 4 });
  });

  it("takes the server's current listing on conflict", async () => {
    const current = makeListing({ id: "L0001", price: 125, version: 5 });
    const { qc, observer } = setup(() =>
      json(409, { error: { code: "CONFLICT", message: "Changed elsewhere", retryable: false }, current }),
    );
    await observer.mutate({ id: "L0001", price: 130 }).catch(() => {});
    expect(qc.getQueryData<Listing>(keys.listing("L0001"))).toEqual(current);
  });
});

describe("applyChanges", () => {
  it("replaces only the changed listing's entry", () => {
    const qc = new QueryClient();
    const a = makeListing({ id: "A" });
    const b = makeListing({ id: "B" });
    qc.setQueryData(keys.listing("A"), a);
    qc.setQueryData(keys.listing("B"), b);
    applyChanges(qc, [{ ...a, sync: { ...a.sync, stubhub: { state: "error", updatedAt: a.sync.stubhub.updatedAt } } }]);
    expect(qc.getQueryData(keys.listing("A"))).not.toBe(a);
    expect(qc.getQueryData(keys.listing("B"))).toBe(b);
  });
});
