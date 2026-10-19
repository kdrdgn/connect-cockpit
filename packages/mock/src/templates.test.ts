import { describe, expect, it } from "vitest";
import { ERROR_TEMPLATES, ORDINARY_TEMPLATES } from "./templates";

describe("error templates", () => {
  it("has 7 invented templates that each render a non-empty string", () => {
    expect(ERROR_TEMPLATES).toHaveLength(7);
    for (const t of ERROR_TEMPLATES) {
      expect(t.invented).toBe(true);
      const text = t.render({ marketplace: "stubhub", marketPrice: 100, quantity: 2, section: "104", row: "F", n: 7 });
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it("keeps the injection template out of ordinary use", () => {
    expect(ORDINARY_TEMPLATES.map((t) => t.key)).not.toContain("injection");
  });
});
