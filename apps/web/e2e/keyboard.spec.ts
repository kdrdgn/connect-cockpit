import { expect, test } from "@playwright/test";

test("Tab from the last rendered row renders and focuses the next row", async ({ page }) => {
  await page.goto("/?rate429=0&latency=0-20");
  await page.locator("tbody tr[data-id]").first().waitFor();
  const last = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>("tbody tr[data-id]")];
    const row = rows.at(-1)!;
    // Focus without scrolling, so the next row really is outside the rendered window.
    row.querySelector<HTMLElement>('button[aria-label^="Price"]')!.focus({ preventScroll: true });
    return Number(row.dataset.index);
  });
  await expect(page.locator(`tbody tr[data-index="${last + 1}"]`)).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(page.locator(`tbody tr[data-index="${last + 1}"] input[type=checkbox]`)).toBeFocused();
});

test("arrow keys move between cells and rows", async ({ page }) => {
  await page.goto("/?rate429=0&latency=0-20");
  await page.locator("tbody tr[data-id]").first().waitFor();
  await page.locator('tbody tr[data-index="0"] input[type=checkbox]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('tbody tr[data-index="0"] button[aria-label^="Quantity"]')).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('tbody tr[data-index="2"] button[aria-label^="Quantity"]')).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.locator('tbody tr[data-index="2"] button[aria-label^="Price"]')).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(page.locator('tbody tr[data-index="22"] button[aria-label^="Price"]')).toBeFocused();
});

test("skip link, / and ? work from the keyboard alone", async ({ page }) => {
  await page.goto("/?rate429=0&latency=0-20");
  await page.locator("tbody tr[data-id]").first().waitFor();
  // In dev, the Next.js dev-tools button takes the first Tab stop; in a production build the skip links are first.
  const toListings = page.getByRole("link", { name: "Skip to listings" });
  for (let i = 0; i < 2 && !(await toListings.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(toListings).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('tbody tr[data-index="0"] input[type=checkbox]')).toBeFocused();

  // Start Tab from the top again.
  await page.reload();
  await page.locator("tbody tr[data-id]").first().waitFor();
  const skip = page.getByRole("link", { name: "Skip to bulk actions" });
  for (let i = 0; i < 3 && !(await skip.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#bulk-actions")).toBeFocused();

  await page.keyboard.press("/");
  await expect(page.getByRole("searchbox", { name: "Search events" })).toBeFocused();
  await page.keyboard.type("?");
  await expect(page.getByRole("dialog")).toHaveCount(0); // typed into search, not a shortcut
  await page.keyboard.press("Escape");

  await page.locator('tbody tr[data-index="0"] input[type=checkbox]').focus();
  await page.keyboard.press("?");
  const sheet = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Next / previous problem")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});
