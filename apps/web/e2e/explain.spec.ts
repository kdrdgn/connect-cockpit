import { expect, test } from "@playwright/test";

// The AI route is stubbed, so this checks the UI path deterministically and never depends on a key.
// Stubbed on the context: MSW's service worker forwards the request, and page.route can't see worker traffic.
test("a suggested price opens the inline editor filled in, and nothing is sent until Enter", async ({ page }) => {
  await page.context().route("**/api/ai/explain-sync", (route) =>
    route.fulfill({
      json: {
        result: {
          explanation: "SeatGeek has a minimum price for this event and yours is under it.",
          cause: "price_rule",
          action: "adjust_price",
          confidence: "high",
          floor: 1,
          flagged: false,
        },
        meta: { source: "model", cached: false, inputTokens: 410, outputTokens: 62, latencyMs: 900 },
      },
    }),
  );
  const patches: string[] = [];
  page.on("request", (r) => r.method() === "PATCH" && patches.push(r.url()));

  await page.goto("/?chaos=off&sync=seatgeek:error");
  const row = page.locator('tbody tr[data-index="0"]');
  await row.locator("td").nth(1).click(); // the event cell, not a control
  const seatgeek = page.locator("aside[aria-labelledby=drawer-title]").getByRole("region", { name: "SeatGeek", exact: true });

  const suggestion = seatgeek.getByRole("button", { name: /^Suggested: Adjust price to £\d+$/ });
  await expect(seatgeek).toContainText("SeatGeek has a minimum price for this event");
  const price = (await suggestion.textContent())!.match(/£(\d+)/)![1]!;
  await suggestion.click();

  await expect(row.getByRole("textbox")).toHaveValue(price);
  await expect(row.getByRole("textbox")).toBeFocused();
  expect(patches).toHaveLength(0);
});
