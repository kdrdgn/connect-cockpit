import { describe, expect, it } from "vitest";
import { formatDate, formatDateLong } from "./format";

describe("dates", () => {
  const friday = "2026-10-30T19:30:00.000Z";

  it("shows day and short month in the table, day first", () => {
    expect(formatDate(friday)).toBe("30 Oct");
  });

  it("keeps the weekday in the full date", () => {
    expect(formatDateLong(friday)).toBe("Friday, 30 October 2026");
  });
});
