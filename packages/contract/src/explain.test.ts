import { describe, expect, it } from "vitest";
import { ExplainModelOutput, ExplainRequest, toExplainRequest } from "./explain";
import { makeListing } from "./testing";

const valid = { explanation: "SeatGeek wants a higher price.", cause: "price_rule", action: "adjust_price", confidence: "high" };
const request = { marketplace: "seatgeek", lastError: "Timed out", price: 90, marketPrice: 120, quantity: 4 };

describe("ExplainModelOutput", () => {
  it("accepts a valid answer", () => {
    expect(ExplainModelOutput.safeParse(valid).success).toBe(true);
  });

  it("rejects an action outside the enum", () => {
    expect(ExplainModelOutput.safeParse({ ...valid, action: "delist_all" }).success).toBe(false);
  });

  it("rejects an explanation of 600 characters", () => {
    expect(ExplainModelOutput.safeParse({ ...valid, explanation: "x".repeat(600) }).success).toBe(false);
  });

  it("rejects fields the model may not set, such as a listing id", () => {
    expect(ExplainModelOutput.safeParse({ ...valid, listingId: "L0002" }).success).toBe(false);
  });
});

describe("ExplainRequest", () => {
  it("rejects an event field", () => {
    expect(ExplainRequest.safeParse({ ...request, event: "Night Shift" }).success).toBe(false);
  });

  it("is built from a listing without event, venue or id", () => {
    const listing = makeListing();
    listing.sync.seatgeek = { state: "error", updatedAt: listing.date, lastError: "Timed out" };
    const body = toExplainRequest(listing, "seatgeek");
    expect(body).toEqual({ marketplace: "seatgeek", lastError: "Timed out", price: 120, marketPrice: 118, quantity: 4 });
    expect(ExplainRequest.safeParse(body).success).toBe(true);
  });

  it("is null for a marketplace that is not in error", () => {
    expect(toExplainRequest(makeListing(), "stubhub")).toBeNull();
  });
});
