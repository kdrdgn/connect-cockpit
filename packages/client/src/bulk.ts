import type { ApiErrorBody, BulkOp, BulkResult, Listing } from "@cockpit/contract";
import type { QueryClient } from "@tanstack/react-query";
import { putListing } from "./cache";

/** Not crypto.randomUUID: Hermes does not ship it. Uniqueness per user intent is all the key needs. */
export function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type BulkSummary = {
  succeeded: Listing[];
  failed: { id: string; error: ApiErrorBody }[];
};

export function summarize(results: BulkResult[]): BulkSummary {
  const summary: BulkSummary = { succeeded: [], failed: [] };
  for (const r of results) {
    if (r.ok) summary.succeeded.push(r.listing);
    else summary.failed.push({ id: r.id, error: r.error });
  }
  return summary;
}

/** Puts each successful listing into the cache; failed rows keep their previous value. */
export function applyBulkResults(qc: QueryClient, results: BulkResult[]): void {
  for (const r of results) if (r.ok) putListing(qc, r.listing);
}

/** The failed ops only, as a new user intent with a new idempotency key. */
export function failedOps(ops: BulkOp[], results: BulkResult[], key: () => string = newIdempotencyKey) {
  const failed = new Set(results.filter((r) => !r.ok).map((r) => r.id));
  return { ops: ops.filter((op) => failed.has(op.id)), idempotencyKey: key() };
}

/**
 * Reverses only what succeeded: old prices for setPrice, relist for delist. Each op carries the
 * version the server just returned, so a row edited again since then fails individually with CONFLICT.
 */
export function buildUndo(
  ops: BulkOp[],
  results: BulkResult[],
  before: ReadonlyMap<string, Listing>,
  key: () => string = newIdempotencyKey,
) {
  const after = new Map(results.flatMap((r) => (r.ok ? [[r.id, r.listing] as const] : [])));
  const undo: BulkOp[] = [];
  for (const op of ops) {
    const done = after.get(op.id);
    const prev = before.get(op.id);
    if (!done || !prev) continue;
    if (op.op === "setPrice") undo.push({ op: "setPrice", id: op.id, version: done.version, price: prev.price });
    else if (op.op === "delist") undo.push({ op: "relist", id: op.id, version: done.version, marketplace: op.marketplace });
    else undo.push({ op: "delist", id: op.id, version: done.version, marketplace: op.marketplace });
  }
  return { ops: undo, idempotencyKey: key() };
}
