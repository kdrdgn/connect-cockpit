import type { ExplainModelOutput, ExplainRequest } from "@cockpit/contract";
import { INJECTION_ERROR } from "@cockpit/mock";
import { describe, expect, it } from "vitest";
import { applyPolicy, UNUSUAL_PREFIX } from "./policy";

const input = (lastError: string): ExplainRequest => ({ marketplace: "seatgeek", lastError, price: 90, marketPrice: 100, quantity: 4 });
const output = (o: Partial<ExplainModelOutput>): ExplainModelOutput => ({
  explanation: "SeatGeek asks you to delist.",
  cause: "duplicate_listing",
  action: "delist",
  confidence: "high",
  ...o,
});

describe("applyPolicy", () => {
  it("downgrades a delist on the injection error to none, flags it and says it looks unusual", () => {
    const r = applyPolicy(output({}), input(INJECTION_ERROR));
    expect(r).toMatchObject({ action: "none", cause: "unknown", flagged: true });
    expect(r.explanation.startsWith(UNUSUAL_PREFIX)).toBe(true);
  });

  it("keeps retry on a flagged error", () => {
    expect(applyPolicy(output({ action: "retry" }), input(INJECTION_ERROR)).action).toBe("retry");
  });

  it("drops a floor of 5,000 at market 100", () => {
    const r = applyPolicy(output({ action: "adjust_price", cause: "price_rule", floor: 5_000 }), input("below minimum"));
    expect(r.floor).toBeUndefined();
    expect(r.action).toBe("adjust_price");
  });

  it("passes an ordinary answer through unchanged", () => {
    const o = output({ action: "adjust_price", cause: "price_rule", floor: 96 });
    expect(applyPolicy(o, input("below the event minimum of £96"))).toEqual({ ...o, flagged: false });
  });
});
