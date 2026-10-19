import { expect, test } from "@playwright/test";

test("no demo panel without the flag", async ({ page }) => {
  await page.goto("/?rate429=0&latency=0-50");
  await page.locator("tbody tr[data-id]").first().waitFor();
  await page.waitForTimeout(500);
  await expect(page.getByRole("button", { name: "Demo", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Demo controls" })).toHaveCount(0);
});

test("with ?demo=1, a 50% failure rate makes about half of a 40-row bulk change fail", async ({ page }) => {
  await page.goto("/?demo=1&rate429=0&latency=0-50");
  await page.locator("tbody tr[data-id]").first().waitFor();
  await page.getByRole("button", { name: "Demo", exact: true }).click();
  const panel = page.getByRole("region", { name: "Demo controls" });
  await expect(panel).toContainText("not any real marketplace");
  await panel.getByRole("slider").fill("50");
  await expect(panel.locator("output")).toHaveText("50%");

  await page.locator('tbody tr[data-index="0"] input[type=checkbox]').click();
  await page.locator("[data-table-scroller]").evaluate((el) => (el.scrollTop = 30 * 40));
  await page.locator('tbody tr[data-index="39"] input[type=checkbox]').click({ modifiers: ["Shift"] });
  await page.getByLabel("Change price by").fill("5");
  await page.getByRole("button", { name: "Preview price change" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Apply to/ }).click();
  await expect(dialog.getByRole("heading")).toHaveText(/updated/);
  const heading = await dialog.getByRole("heading").textContent();
  const failed = Number(/(\d+) failed/.exec(heading ?? "")?.[1] ?? 0);
  expect(failed).toBeGreaterThanOrEqual(10);
  expect(failed).toBeLessThanOrEqual(30);
});
