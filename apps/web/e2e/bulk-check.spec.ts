import { writeFails } from "@cockpit/mock";
import { expect, test } from "@playwright/test";

const SEED = 42;

test("bulk preview -> apply lists exactly the rows writeFails predicts", async ({ page }) => {
  await page.goto(`/?seed=${SEED}&rate429=0&latency=0-50`);
  await page.locator("tbody tr[data-id]").first().waitFor();
  const boxes = page.locator("tbody tr[data-id] input[type=checkbox]");
  await boxes.nth(0).click();
  await page.locator('tbody tr[data-index="20"]').scrollIntoViewIfNeeded();
  await page.locator('tbody tr[data-index="39"]').scrollIntoViewIfNeeded();
  await page.locator('tbody tr[data-index="39"] input[type=checkbox]').click({ modifiers: ["Shift"] });
  await expect(page.getByText("40 selected")).toBeVisible();

  const seen = new Map<number, string>();
  const collect = async () => {
    const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("tbody tr[data-id]")].map((r) => [Number(r.dataset.index), r.dataset.id!] as const));
    for (const [i, id] of rows) if (i < 40) seen.set(i, id);
  };
  await collect();
  await page.locator("[data-table-scroller]").evaluate((el) => (el.scrollTop = 0));
  await page.locator('tbody tr[data-index="0"]').waitFor();
  await collect();
  const ids = [...seen.values()];
  expect(ids).toHaveLength(40);
  const predicted = ids.filter((id) => writeFails(SEED, id, 1, 15)).sort();

  await page.getByLabel("Change price by").fill("-10");
  await page.getByRole("button", { name: "Preview price change" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toHaveText("Preview: −10% price on 40 listings");
  await expect(dialog.locator("tbody tr")).toHaveCount(40);
  await page.screenshot({ path: "test-results/bulk-preview.png" });
  await dialog.getByRole("button", { name: /^Apply to/ }).click();

  await expect(dialog.getByRole("heading")).toHaveText(`${40 - predicted.length} updated, ${predicted.length} failed`);
  const listed = await dialog.locator("tbody tr[data-listing-id]").evaluateAll((rows) => rows.map((r) => (r as HTMLElement).dataset.listingId!));
  expect(listed.sort()).toEqual(predicted);
  // Rendered failed rows are marked in the table too.
  const marked = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("tbody tr[data-id]")].filter((r) => r.className.includes("failed")).map((r) => r.dataset.id!));
  for (const id of marked) expect(predicted).toContain(id);
  await page.screenshot({ path: "test-results/bulk-result.png" });
});

test("retry sends only the failed ops under a new key; undo restores old prices", async ({ page }) => {
  const bulkCalls: { key: string | null; ops: { id: string; op: string; price?: number }[] }[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/listings/bulk")) bulkCalls.push({ key: r.headers()["idempotency-key"] ?? null, ops: JSON.parse(r.postData() ?? "{}").ops });
  });
  await page.goto(`/?seed=${SEED}&rate429=0&latency=0-50`);
  await page.locator("tbody tr[data-id]").first().waitFor();
  const before = new Map(
    await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("tbody tr[data-id]")].slice(0, 10).map((r) => [r.dataset.id!, r.querySelector('button[aria-label^="Price"]')!.textContent!] as const),
    ),
  );
  await page.locator('tbody tr[data-index="0"] input[type=checkbox]').click();
  await page.locator('tbody tr[data-index="9"] input[type=checkbox]').click({ modifiers: ["Shift"] });
  await page.getByLabel("Change price by").fill("10");
  await page.getByRole("button", { name: "Preview price change" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /^Apply to/ }).click();
  await expect(dialog.getByRole("heading")).toHaveText(/updated/);

  const first = bulkCalls[0]!;
  const failedFirst = first.ops.filter((op) => writeFails(SEED, op.id, 1, 15)).map((o) => o.id);
  if (failedFirst.length) {
    await dialog.getByRole("button", { name: /^Retry failed/ }).click();
    await expect(dialog.getByRole("button", { name: /^Retry failed/ })).toHaveCount(failedFirst.filter((id) => writeFails(SEED, id, 2, 15)).length ? 1 : 0);
    const retry = bulkCalls[1]!;
    expect(retry.ops.map((o) => o.id).sort()).toEqual(failedFirst.sort());
    expect(retry.key).not.toBe(first.key);
  }

  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator("tbody tr[data-index='0'] input[type=checkbox]").focus();
  await page.keyboard.press("ControlOrMeta+z");
  const undo = bulkCalls.at(-1)!;
  expect(new Set(bulkCalls.map((c) => c.key)).size).toBe(bulkCalls.length);
  await expect(dialog.getByRole("heading")).toHaveText(/undone/);
  for (const op of undo.ops) expect(`£${op.price}`).toBe(before.get(op.id));
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  // Undo is a write too, so it can fail per row: expect the old price exactly where its attempt succeeds.
  const attempt = (id: string) => bulkCalls.filter((c) => c.ops.some((o) => o.id === id)).length;
  const restored = undo.ops.filter((o) => !writeFails(SEED, o.id, attempt(o.id), 15));
  expect(restored.length).toBeGreaterThan(0);
  for (const op of restored) {
    await expect(page.locator(`tbody tr[data-id="${op.id}"] button[aria-label^="Price"]`)).toHaveText(before.get(op.id)!);
  }
});
