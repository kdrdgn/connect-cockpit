import { toSearchParams } from "@cockpit/contract";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { loadFilters, SEARCH_DEBOUNCE_MS, toListQuery, useDebounced } from "./filters";

describe("filters", () => {
  it("a URL round-trips to the same ListQueryInput", () => {
    const url = "sync=stubhub:error&sync=seatgeek:error&priceMax=150&section=104&q=glass&dateFrom=2026-10-20&problem=any&sort=price:desc";
    const query = toListQuery(loadFilters(new URLSearchParams(url)));
    expect(query).toEqual({
      sort: { field: "price", dir: "desc" },
      q: "glass",
      dateFrom: "2026-10-20",
      priceMax: 150,
      section: "104",
      sync: [
        { marketplace: "stubhub", state: "error" },
        { marketplace: "seatgeek", state: "error" },
      ],
      problem: "any",
    });
    const back = toListQuery(loadFilters(toSearchParams(query)));
    expect(back).toEqual(query);
  });

  it("drops invalid values and keeps the rest", () => {
    const query = toListQuery(loadFilters(new URLSearchParams("priceMin=abc&priceMax=-3&sync=stubhub:bogus&sync=ticombo:error&dateTo=yesterday&sort=nope")));
    expect(query).toEqual({ sort: { field: "date", dir: "asc" }, sync: [{ marketplace: "ticombo", state: "error" }] });
  });

  it("fast typing produces one query value", () => {
    vi.useFakeTimers();
    const seen: string[] = [];
    const { rerender } = renderHook(({ v }) => {
      const d = useDebounced(v, SEARCH_DEBOUNCE_MS);
      if (seen.at(-1) !== d) seen.push(d);
      return d;
    }, { initialProps: { v: "" } });
    for (const v of ["g", "gl", "gla", "glas", "glass"]) {
      rerender({ v });
      act(() => void vi.advanceTimersByTime(40));
    }
    act(() => void vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS));
    expect(seen).toEqual(["", "glass"]);
    vi.useRealTimers();
  });
});
