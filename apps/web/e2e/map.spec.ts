import { expect, test } from "@playwright/test";

test("clicking a section filters by it; clicking again clears it", async ({ page }) => {
  await page.goto("/?rate429=0&latency=0-50");
  await page.locator("tbody tr[data-id]").first().waitFor();
  await expect(page.locator("[data-section]")).toHaveCount(16);
  const s104 = page.getByRole("button", { name: /^Section 104, \d+ listings/ });
  await s104.click();
  await expect(page).toHaveURL(/section=104/);
  await expect(page.getByText("Section 104", { exact: true })).toBeVisible(); // the chip
  await expect(s104).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("table")).toHaveAttribute("aria-busy", "false"); // the filtered rows have arrived
  const sections = await page.locator("tbody tr[data-id] td:nth-child(4)").allTextContents();
  expect(new Set(sections)).toEqual(new Set(["104"]));
  await page.screenshot({ path: "test-results/map.png" });
  await s104.click();
  await expect(page).not.toHaveURL(/section=/);
});

test("the focused row's section is highlighted, and sections work from the keyboard", async ({ page }) => {
  await page.goto("/?rate429=0&latency=0-50");
  await page.locator("tbody tr[data-id]").first().waitFor();
  const row = page.locator('tbody tr[data-index="0"]');
  const section = (await row.locator("td").nth(3).textContent())!;
  await row.locator("input[type=checkbox]").focus();
  await expect(page.locator(`[data-section="${section}"]`)).toHaveAttribute("aria-label", /current row$/);
  const other = page.locator('tbody tr[data-id]').filter({ hasNot: page.locator(`td:nth-child(4):text-is("${section}")`) }).first();
  const otherSection = (await other.locator("td").nth(3).textContent())!;
  await other.locator("input[type=checkbox]").focus();
  await expect(page.locator(`[data-section="${otherSection}"]`)).toHaveAttribute("aria-label", /current row$/);
  await expect(page.locator(`[data-section="${section}"]`)).not.toHaveAttribute("aria-label", /current row$/);
  await page.locator(`[data-section="${otherSection}"]`).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`section=${otherSection}`));
});
