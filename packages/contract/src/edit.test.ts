import { describe, expect, it } from "vitest";
import { parseEdit } from "./edit";

describe("parseEdit", () => {
  it.each([
    ["", "Enter a price"],
    ["0", "Price must be more than £0"],
    ["1.234", "Use at most 2 decimals"],
    ["abc", "Price must be a number"],
  ])("price %j -> %s", (raw, message) => {
    expect(parseEdit("price", raw)).toEqual({ ok: false, message });
  });

  it("accepts £48.50 as a price", () => {
    expect(parseEdit("price", "£48.50")).toEqual({ ok: true, value: 48.5 });
  });

  it("rejects -1 as a quantity", () => {
    expect(parseEdit("quantity", "-1")).toEqual({ ok: false, message: "Quantity must be 0 or more" });
  });
});
