import { describe, expect, it } from "vitest";
import { Listing } from "./listing";
import { makeListing } from "./testing";

describe("Listing", () => {
  it("parses a valid listing", () => {
    const result = Listing.safeParse(makeListing());
    expect(result.success).toBe(true);
  });

  it("rejects an unknown sync state and names the field", () => {
    const bad = makeListing();
    const result = Listing.safeParse({
      ...bad,
      sync: { ...bad.sync, stubhub: { ...bad.sync.stubhub, state: "paused" } },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["sync", "stubhub", "state"]);
  });
});
