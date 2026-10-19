import { expect, test } from "@playwright/test";

test("o opens the drawer with focus inside; Escape returns focus to the same cell", async ({ page }) => {
  await page.goto("/?rate429=0&latency=0-50");
  await page.locator("tbody tr[data-id]").first().waitFor();
  const cell = page.locator('tbody tr[data-index="3"] button[aria-label^="Quantity"]');
  await cell.focus();
  await page.keyboard.press("o");
  const drawer = page.locator("aside[aria-labelledby=drawer-title]");
  await expect(drawer).toBeVisible();
  await expect(page.locator("#drawer-title")).toBeFocused();
  await expect(page.locator('tbody tr[data-index="3"]')).toBeVisible(); // the drawer doesn't cover the row
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(cell).toBeFocused();
});

test("retry sync shows pending in the drawer and the table at once, and history records it", async ({ page }) => {
  await page.goto("/?rate429=0&latency=0-50&sync=stubhub:error");
  await page.locator("tbody tr[data-id]").first().waitFor();
  const row = page.locator('tbody tr[data-index="0"]');
  await row.locator("td").nth(1).click(); // the event cell, not a control
  const drawer = page.locator("aside[aria-labelledby=drawer-title]");
  // Drift keeps running, so retry whichever marketplace offers it when the drawer opens (StubHub, unless it just moved).
  const offering = drawer.getByRole("region").filter({ has: page.getByRole("button", { name: "Retry sync" }) }).first();
  const name = (await offering.getAttribute("aria-label"))!;
  // Pin it by name: the Retry button goes away once the marketplace is pending.
  const region = drawer.getByRole("region", { name, exact: true });
  const retry = region.getByRole("button", { name: "Retry sync" });
  await expect(region.locator("p").last()).not.toBeEmpty(); // the full last error
  await retry.click();
  await expect(region).toContainText("Pending");
  const col = ["StubHub", "SeatGeek", "Vivid Seats", "Ticombo"].indexOf(name);
  await expect(row.locator("[role=img]").nth(col)).toHaveAttribute("aria-label", `${name}: pending`);
  await expect(drawer.getByRole("region", { name: "Sync history" }).locator("li").first()).toContainText(`${name}: pending`);
});
