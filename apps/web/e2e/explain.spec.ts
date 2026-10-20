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

test("the action row keeps its emphasis and order when the explanation arrives, and a retry is not repeated", async ({ page }) => {
  let release!: () => void;
  const answered = new Promise<void>((r) => (release = r));
  await page.context().route("**/api/ai/explain-sync", async (route) => {
    await answered;
    await route.fulfill({
      json: {
        result: { explanation: "SeatGeek is having an outage; a retry usually clears it.", cause: "marketplace_outage", action: "retry", confidence: "high", flagged: false },
        meta: { source: "model", cached: false, inputTokens: 400, outputTokens: 50, latencyMs: 900 },
      },
    });
  });

  await page.goto("/?chaos=off&sync=seatgeek:error");
  await page.locator('tbody tr[data-index="0"]').locator("td").nth(1).click();
  const seatgeek = page.locator("aside[aria-labelledby=drawer-title]").getByRole("region", { name: "SeatGeek", exact: true });
  // CSS module class names are hashed but keep the variant name.
  const row = () =>
    seatgeek.getByRole("button").evaluateAll((buttons) =>
      buttons
        .filter((b) => !b.textContent?.startsWith("Suggested") && b.textContent !== "Try again")
        .map((b) => `${b.textContent}:${/primary|danger|ghost/.exec(b.className)?.[0] ?? "default"}`),
    );

  await expect(seatgeek.getByText("Reading the error…")).toBeVisible();
  const before = await row();
  expect(before).toEqual(["Retry sync:primary", "Edit price:default", "Delist…:ghost"]);

  release();
  await expect(seatgeek).toContainText("a retry usually clears it");
  expect(await row()).toEqual(before);
  await expect(seatgeek.getByRole("button", { name: "Retry sync" })).toHaveCount(1);
  await expect(seatgeek.getByRole("button", { name: /^Suggested:/ })).toHaveCount(0);
});
