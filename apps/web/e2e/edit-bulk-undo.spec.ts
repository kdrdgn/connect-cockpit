import { writeFails } from "@cockpit/mock";
import { expect, type Page, test } from "@playwright/test";

// The brief's journey, deterministic: which writes fail is hash(seed, id, attempt), so the test knows in advance.
const SEED = 1234;
const FAIL_RATE = 15;

async function idsOfFirst(page: Page, n: number): Promise<string[]> {
  const seen = new Map<number, string>();
  const scroller = page.locator("[data-table-scroller]");
  for (const top of [0, 600, 0]) {
    await scroller.evaluate((el, t) => (el.scrollTop = t), top);
    await page.waitForTimeout(100);
    const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("tbody tr[data-id]")].map((r) => [Number(r.dataset.index), r.dataset.id!] as const));
    for (const [i, id] of rows) if (i < n) seen.set(i, id);
  }
  return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([, id]) => id);
}

test("edit a price, bulk -10% on 40 rows, retry the predicted failures, then undo", async ({ page }) => {
  const bulkCalls: { key: string; ops: { id: string; price?: number }[] }[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/listings/bulk")) bulkCalls.push({ key: r.headers()["idempotency-key"]!, ops: JSON.parse(r.postData()!).ops });
  });
  await page.goto(`/?seed=${SEED}&rate429=0&latency=0-50&failRate=${FAIL_RATE}`);
  await page.locator("tbody tr[data-id]").first().waitFor();
  const ids = await idsOfFirst(page, 40);
  expect(ids).toHaveLength(40);
  const attempts = new Map<string, number>();
  const nextAttempt = (id: string) => {
    const a = (attempts.get(id) ?? 0) + 1;
    attempts.set(id, a);
    return a;
  };

  // 1. Inline edit from the keyboard on a row whose first write succeeds.
  const editIndex = ids.findIndex((id) => !writeFails(SEED, id, 1, FAIL_RATE));
  const editId = ids[editIndex]!;
  const priceCell = page.locator(`tbody tr[data-id="${editId}"] button[aria-label^="Price"]`);
  await priceCell.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.type("321");
  await page.keyboard.press("Enter");
  nextAttempt(editId);
  await expect(priceCell).toHaveText("£321");
  await expect(priceCell).not.toHaveAttribute("aria-label", /saving/);

  // 2. Select 40 rows with a shift-click range and preview -10%.
  await page.locator("[data-table-scroller]").evaluate((el) => (el.scrollTop = 0));
  await page.locator('tbody tr[data-index="0"] input[type=checkbox]').click();
  await page.locator("[data-table-scroller]").evaluate((el) => (el.scrollTop = 30 * 40));
  await page.locator('tbody tr[data-index="39"] input[type=checkbox]').click({ modifiers: ["Shift"] });
  await expect(page.getByText("40 selected")).toBeVisible();
  await page.getByLabel("Change price by").fill("-10");
  await page.getByRole("button", { name: "Preview price change" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("tbody tr")).toHaveCount(40);
  await dialog.getByRole("button", { name: /^Apply to 40/ }).click();

  // 3. Exactly the predicted rows fail.
  const predicted = ids.filter((id) => writeFails(SEED, id, nextAttempt(id), FAIL_RATE)).sort();
  expect(predicted.length).toBeGreaterThan(0);
  await expect(dialog.getByRole("heading")).toHaveText(`${40 - predicted.length} updated, ${predicted.length} failed`);
  const listed = await dialog.locator("tbody tr[data-listing-id]").evaluateAll((rows) => rows.map((r) => (r as HTMLElement).dataset.listingId!));
  expect(listed.sort()).toEqual(predicted);

  // 4. Retry only those, under a new idempotency key.
  await dialog.getByRole("button", { name: `Retry failed (${predicted.length})` }).click();
  const retry = bulkCalls[1]!;
  expect(retry.ops.map((o) => o.id).sort()).toEqual(predicted);
  expect(retry.key).not.toBe(bulkCalls[0]!.key);
  const stillFailing = predicted.filter((id) => writeFails(SEED, id, nextAttempt(id), FAIL_RATE));
  await expect(dialog.getByRole("heading")).toHaveText(
    stillFailing.length ? `${40 - stillFailing.length} updated, ${stillFailing.length} failed` : "40 updated",
  );

  // 5. Undo reverses only what succeeded, restoring the prices from before the bulk change.
  const succeeded = 40 - stillFailing.length;
  await dialog.getByRole("button", { name: `Undo ${succeeded} changes` }).click();
  const undo = bulkCalls[2]!;
  expect(undo.ops).toHaveLength(succeeded);
  const undoFailed = undo.ops.filter((o) => writeFails(SEED, o.id, nextAttempt(o.id), FAIL_RATE)).map((o) => o.id);
  await expect(dialog.getByRole("heading")).toHaveText(
    undoFailed.length ? `${succeeded - undoFailed.length} undone, ${undoFailed.length} failed` : `${succeeded} undone`,
  );
  const editUndo = undo.ops.find((o) => o.id === editId);
  if (editUndo && !undoFailed.includes(editId)) {
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.locator("[data-table-scroller]").evaluate((el, i) => (el.scrollTop = Math.max(0, i * 40 - 200)), editIndex);
    await expect(priceCell).toHaveText("£321"); // back to the edited price, not the generated one
  }
});
