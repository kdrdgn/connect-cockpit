import { buildUndo, failedOps, keys, newIdempotencyKey, useBulk } from "@cockpit/client";
import type { BulkOp, BulkResult, Listing } from "@cockpit/contract";
import { useQueryClient } from "@tanstack/react-query";
import { useToasts } from "@/ui/Toast";
import { type BulkIntent, previewBulk } from "./bulkPreview";
import { type LastBulk, useUi } from "./store";

/** Replaces earlier results for the same ids, so retries and the original apply read as one intent. */
function mergeResults(prev: BulkResult[], next: BulkResult[]): BulkResult[] {
  const byId = new Map(next.map((r) => [r.id, r]));
  return prev.map((r) => byId.get(r.id) ?? r);
}

export const succeededCount = (b: LastBulk) => b.results.filter((r) => r.ok).length;
export const failedCount = (b: LastBulk) => b.results.filter((r) => !r.ok).length;

/** The bulk state machine: preview -> apply -> result, plus "Retry failed" and a depth-1 Undo. */
export function useBulkFlow() {
  const qc = useQueryClient();
  const bulk = useBulk();
  const toast = useToasts((s) => s.show);
  const ui = useUi;

  const listingsOf = (ids: Iterable<string>) => [...ids].flatMap((id) => qc.getQueryData<Listing>(keys.listing(id)) ?? []);

  async function send(ops: BulkOp[], label: string, onDone: (results: BulkResult[]) => void) {
    ui.getState().setBulk({ stage: "applying", label });
    try {
      const res = await bulk.mutateAsync({ ops, idempotencyKey: newIdempotencyKey() });
      onDone(res.results);
      ui.getState().setBulk({ stage: "result" });
    } catch (e) {
      // The whole request failed (not per-item): nothing was applied, so the broker can simply try again.
      ui.getState().setBulk({ stage: "idle" });
      toast({ id: "bulk", tone: "danger", title: "Bulk change not sent", body: e instanceof Error ? e.message : String(e) });
    }
  }

  return {
    preview(intent: BulkIntent, orderedIds: readonly string[]) {
      const selection = ui.getState().selection;
      const listings = listingsOf(orderedIds.filter((id) => selection.has(id)));
      const { rows, ops } = previewBulk(listings, intent);
      ui.getState().setBulk({ stage: "preview", intent, rows, ops });
    },

    async apply() {
      const b = ui.getState().bulk;
      if (b.stage !== "preview" || b.ops.length === 0) return;
      const before = new Map(b.rows.map((r) => [r.id, r.listing]));
      await send(b.ops, `Applying ${b.ops.length} changes…`, (results) =>
        ui.getState().setLastBulk({ kind: "apply", intent: b.intent, ops: b.ops, results, before }),
      );
    },

    async retryFailed() {
      const last = ui.getState().lastBulk;
      if (!last) return;
      // A new intent with a new key: the server treats it as a fresh attempt, which may now succeed.
      const { ops } = failedOps(last.ops, last.results);
      if (ops.length === 0) return;
      await send(ops, `Retrying ${ops.length}…`, (results) =>
        ui.getState().setLastBulk({ ...last, kind: last.kind === "undo" ? "undo" : "retry", results: mergeResults(last.results, results) }),
      );
    },

    async undo() {
      const last = ui.getState().lastBulk;
      if (!last || last.kind === "undo") return;
      const undo = buildUndo(last.ops, last.results, last.before);
      if (undo.ops.length === 0) return;
      const before = new Map(listingsOf(undo.ops.map((o) => o.id)).map((l) => [l.id, l]));
      await send(undo.ops, `Undoing ${undo.ops.length}…`, (results) =>
        ui.getState().setLastBulk({ kind: "undo", intent: last.intent, ops: undo.ops, results, before }),
      );
    },

    /** Closes the dialog. The selection and the last result (for Retry/Undo in the bar) are kept. */
    close() {
      ui.getState().setBulk({ stage: "idle" });
    },

    isBusy: () => ui.getState().bulk.stage === "applying",
  };
}
